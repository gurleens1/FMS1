from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
import bcrypt
import jwt
import datetime
import os

router = APIRouter()

JWT_SECRET = os.getenv("JWT_SECRET", "fallback_secret_fms_123")

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(req: LoginRequest):
    # Locate the SQLite database created by Prisma
    db_path = "dev.db"
    if not os.path.exists(db_path) and os.path.exists("prisma/dev.db"):
        db_path = "prisma/dev.db"
    elif not os.path.exists(db_path) and os.path.exists("../prisma/dev.db"):
        db_path = "../prisma/dev.db"
            
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # JOIN the employees table so we can get the full_name for React!
        query = """
            SELECT u.id, u.email, u.password, u.role, e.full_name, e.employee_code 
            FROM user_roles u
            JOIN employees e ON u.employee_id = e.id
            WHERE u.email = ?
        """
        cursor.execute(query, (req.email,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
        user_id, user_email, hashed_pw, role, full_name, emp_code = user
        
        # Verify the password using bcrypt
        if not bcrypt.checkpw(req.password.encode('utf-8'), hashed_pw.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
        # Create the JWT Token
        payload = {
            "email": user_email,
            "role": role,
            "userId": user_id,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        
        # 🔥 THE FIX: Send the exact nested JSON structure React is expecting
        return {
            "token": token,
            "user": {
                "id": user_id,
                "email": user_email,
                "role": role,
                "employee": {
                    "fullName": full_name,
                    "employeeCode": emp_code
                }
            }
        }
        
    except Exception as e:
        print(f"\n🚨 SERVER CRASHED: {str(e)}\n")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")