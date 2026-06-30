from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
import sqlite3
import os
import random
from datetime import datetime  # <-- NEW: Used to generate the updated_at timestamp

router = APIRouter()

class FeedbackCreate(BaseModel):
    feedbackSource: str
    category: str
    priority: str
    nature: Optional[str] = None
    assigneeId: Optional[Any] = None
    secondaryAssigneeId: Optional[Any] = None
    title: Optional[str] = None
    description: Optional[str] = None
    isAnonymous: bool = False
    feedbackRegistrationDate: Optional[str] = None
    notes: Optional[str] = None
    empEmail: Optional[str] = None
    empFullName: Optional[str] = None
    empCode: Optional[str] = None
    empJoiningDate: Optional[str] = None
    empDesignation: Optional[str] = None
    empDepartment: Optional[str] = None

@router.post("")
def create_feedback(data: FeedbackCreate):
    db_path = "dev.db"
    if not os.path.exists(db_path) and os.path.exists("prisma/dev.db"):
        db_path = "prisma/dev.db"
    elif not os.path.exists(db_path) and os.path.exists("../prisma/dev.db"):
        db_path = "../prisma/dev.db"
        
    try:
        # NEW: 'with' automatically closes and unlocks the database no matter what!
        with sqlite3.connect(db_path, timeout=10) as conn:
            cursor = conn.cursor()
            
            safe_assignee_id = int(data.assigneeId) if data.assigneeId else None
            assignment_num = random.randint(10000, 99999)
            dummy_parent_id = 1 
            
            # Generate the exact timestamp SQLite is demanding
            current_time = datetime.utcnow().isoformat()
            
            # Added created_at and updated_at to the query
            query = """
                INSERT INTO feedback_tracker 
                (parent_ticket_id, assignment_number, feedback_source, category, priority, nature, assignee_id, secondary_assignee_id, feedback_title, description, is_anonymous, feedback_registration_date, notes, emp_email, emp_full_name, emp_code, emp_designation, emp_department, emp_joining_date, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            safe_secondary_assignee_id = int(data.secondaryAssigneeId) if data.secondaryAssigneeId else None
            values = (
                dummy_parent_id,
                assignment_num,
                data.feedbackSource,
                data.category,
                data.priority,
                data.nature,
                safe_assignee_id,
                safe_secondary_assignee_id,
                data.title,
                data.description,
                1 if data.isAnonymous else 0,
                data.feedbackRegistrationDate,
                data.notes,
                data.empEmail,
                data.empFullName,
                data.empCode,
                data.empDesignation,
                data.empDepartment,
                data.empJoiningDate,
                current_time,  # created_at
                current_time   # updated_at
            )
            
            cursor.execute(query, values)
            conn.commit()
            
            new_id = cursor.lastrowid
            
        # The 'with' block ends here, automatically closing the connection!
        return {"message": "Feedback successfully submitted!", "id": new_id}
        
    except Exception as e:
        print(f"\n🚨 DATABASE ERROR: {str(e)}\n")
        raise HTTPException(status_code=500, detail="Failed to save feedback to database.")