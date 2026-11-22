from attendance import router as attendance_router
from recognition import router as recognition_router
from face_enrollment import router as face_router
from lecturer import router as lecturer_router
from admin_api import router as admin_router
import auth
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pathlib import Path
import psycopg2

from db import db_conn, dict_cursor, init_db

FRONTEND_DIR = Path(__file__).resolve().parent / "frontend"
# Built React website (npm run build -> copied here by the Dockerfile). Optional.
WEB_DIR = Path(os.getenv("WEB_DIST_DIR", Path(__file__).resolve().parent / "static"))
WEB_INDEX = WEB_DIR / "index.html"

app = FastAPI(
    title="Face ID Attendance System",
    description="AI-Based Automatic Classroom Attendance Backend",
    version="1.0.0"
)

# Allow a separate frontend (React / Next.js dev server) to call this API.
# Set FRONTEND_ORIGINS="http://localhost:3000,http://192.168.1.20:3000" to restrict; default allows all (development only).
_origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create the PostgreSQL tables if they do not exist yet.
init_db()

# Accounts + login: every API request below needs a valid sign-in token.
auth.install(app)


# Student request model
class Student(BaseModel):
    student_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    email: str | None = None
    class_name: str = Field(min_length=1)


@app.get("/", include_in_schema=False)
def home():
    # Hosted version: the React website. Otherwise: a simple status message.
    if WEB_INDEX.exists():
        return FileResponse(WEB_INDEX)
    return {
        "message": "Face ID Backend is Running!",
        "status": "success"
    }


@app.get("/app", include_in_schema=False)
def attendance_dashboard():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Face ID Backend"
    }


# Register a student
@app.post("/students")
def register_student(student: Student):
    try:
        with db_conn() as conn:
            conn.cursor().execute(
                """
                INSERT INTO students (student_id, name, email, class_name)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    student.student_id,
                    student.name,
                    student.email,
                    student.class_name
                )
            )
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail="Student ID already exists"
        )

    return {
        "message": "Student registered successfully",
        "student": student.model_dump()
    }


# Get all students
@app.get("/students")
def get_students():
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute("SELECT * FROM students ORDER BY class_name, student_id")
        students = [dict(row) for row in cur.fetchall()]

    return {
        "total_students": len(students),
        "students": students
    }


# Get student by ID
@app.get("/students/{student_id}")
def get_student(student_id: str):
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            "SELECT * FROM students WHERE student_id = %s",
            (student_id,)
        )
        student = cur.fetchone()

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    return dict(student)


app.include_router(face_router)
app.include_router(recognition_router)
app.include_router(attendance_router)
app.include_router(lecturer_router)
app.include_router(admin_router)

# Static files of the React website (JS/CSS bundles and images), if it was built.
for _sub in ("assets", "src"):
    if (WEB_DIR / _sub).is_dir():
        app.mount(f"/{_sub}", StaticFiles(directory=WEB_DIR / _sub), name=f"web-{_sub}")
