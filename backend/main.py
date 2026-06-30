from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, feedback, users, employees  # <-- Added users and employees

app = FastAPI(title="FMS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect all the routers to their URLs!
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["Feedback"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])

@app.get("/")
def read_root():
    return {"message": "Python FastAPI server is running successfully!"}