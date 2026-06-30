from fastapi import APIRouter

router = APIRouter()

@router.get("/assignees")
def get_assignees():
    # Sending some dummy assignees so your frontend dropdown works instantly!
    return [
        {"id": 1, "name": "Super Admin"},
        {"id": 2, "name": "HR Manager"}
    ]