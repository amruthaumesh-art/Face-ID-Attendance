from fastapi import UploadFile, File
import cv2
import numpy as np
import json

from face_enrollment import get_face_model
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from pathlib import Path
from datetime import datetime, timezone
import sqlite3

router = APIRouter()

DATABASE = Path(__file__).resolve().parent / "students.db"
def init_lecturer_face_table():
    with sqlite3.connect(DATABASE) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS lecturer_face_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lecturer_id TEXT NOT NULL,
                embedding TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (lecturer_id)
                    REFERENCES lecturers(lecturer_id)
            )
        """)


init_lecturer_face_table()


class LecturerRegistration(BaseModel):
    lecturer_id: str
    name: str
    email: EmailStr
    department: str


@router.post("/lecturers/register")
def register_lecturer(data: LecturerRegistration):

    if not all([
        data.lecturer_id.strip(),
        data.name.strip(),
        data.department.strip()
    ]):
        raise HTTPException(
            status_code=400,
            detail="All fields are required"
        )

    try:
        with sqlite3.connect(DATABASE) as conn:
            conn.execute("""
                INSERT INTO lecturers
                (lecturer_id, name, email, department, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                data.lecturer_id.strip(),
                data.name.strip(),
                data.email,
                data.department.strip(),
                datetime.now(timezone.utc).isoformat()
            ))

        return {
            "message": "Lecturer registered successfully",
            "lecturer_id": data.lecturer_id,
            "status": "success"
        }

    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="Lecturer ID or email already exists"
        )


@router.get("/lecturers/{lecturer_id}")
def get_lecturer(lecturer_id: str):

    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row

        lecturer = conn.execute(
            "SELECT lecturer_id, name, email, department, created_at "
            "FROM lecturers WHERE lecturer_id = ?",
            (lecturer_id,)
        ).fetchone()

    if lecturer is None:
        raise HTTPException(
            status_code=404,
            detail="Lecturer not found"
        )

    return dict(lecturer)

@router.post("/lecturers/{lecturer_id}/face")
async def enroll_lecturer_face(
    lecturer_id: str,
    file: UploadFile = File(...)
):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail="Upload a JPG or PNG image"
        )

    image_bytes = await file.read()

    if not image_bytes or len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Invalid image or image exceeds 10 MB"
        )

    with sqlite3.connect(DATABASE) as conn:
        lecturer = conn.execute(
            "SELECT lecturer_id FROM lecturers WHERE lecturer_id = ?",
            (lecturer_id,)
        ).fetchone()

    if lecturer is None:
        raise HTTPException(
            status_code=404,
            detail="Lecturer not registered"
        )

    image_array = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file"
        )

    try:
        model = get_face_model()
        faces = model.get(image)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Face processing failed"
        ) from exc

    if len(faces) != 1:
        raise HTTPException(
            status_code=400,
            detail="Upload an image containing exactly one face"
        )

    face = faces[0]
    x1, y1, x2, y2 = face.bbox.astype(int)

    if x2 - x1 < 80 or y2 - y1 < 80:
        raise HTTPException(
            status_code=400,
            detail="Face is too small"
        )

    embedding = face.normed_embedding.tolist()

    if len(embedding) != 512:
        raise HTTPException(
            status_code=500,
            detail="Invalid embedding dimensions"
        )

    with sqlite3.connect(DATABASE) as conn:
        conn.execute("""
            INSERT INTO lecturer_face_embeddings
            (lecturer_id, embedding, created_at)
            VALUES (?, ?, ?)
        """, (
            lecturer_id,
            json.dumps(embedding),
            datetime.now(timezone.utc).isoformat()
        ))

    return {
        "message": "Lecturer face enrolled successfully",
        "lecturer_id": lecturer_id,
        "embedding_dimensions": 512,
        "status": "success"
    }
