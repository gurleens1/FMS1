from fastapi import APIRouter, HTTPException
import sqlite3
import os

router = APIRouter()

@router.get("")
def list_employees():
    return []

@router.get("/lookup")
def lookup_employee(email: str):
    db_path = "dev.db"
    if not os.path.exists(db_path) and os.path.exists("prisma/dev.db"):
        db_path = "prisma/dev.db"
    elif not os.path.exists(db_path) and os.path.exists("../prisma/dev.db"):
        db_path = "../prisma/dev.db"
        
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Look up the employee by email
        cursor.execute("""
            SELECT full_name, employee_code, designation, department, joining_date 
            FROM employees WHERE email = ?
        """, (email,))
        
        emp = cursor.fetchone()
        conn.close()
        
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
            
        # Send the exact JSON shape React is expecting
        return {
            "fullName": emp[0],
            "employeeCode": emp[1],
            "designation": emp[2],
            "department": emp[3],
            "joiningDate": emp[4]
        }
        
    except Exception as e:
        raise HTTPException(status_code=404, detail="Database lookup failed")