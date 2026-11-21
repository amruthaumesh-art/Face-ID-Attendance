from datetime import datetime, timezone

import cv2
import numpy as np
import psycopg2
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, EmailStr

import face_model
from db import db_conn, dict_cursor

router = APIRouter()

MAX_IMAGE_SIZE = 10 * 1024 * 1024
MIN_FACE_SIZE = 80
BLUR_THRESHOLD = 30.0   # sharpness of the aligned 112x112 face (same as student enrollment)

LECTURER_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS lecturers (
    lecturer_id TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    department  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 512 float32 numbers stored as raw bytes (2 KB per face), like student faces
CREATE TABLE IF NOT EXISTS lecturer_face_embeddings (
    id          SERIAL PRIMARY KEY,
    lecturer_id TEXT NOT NULL REFERENCES lecturers (lecturer_id),
    embedding   BYTEA NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lecturer_embeddings_lecturer
    ON lecturer_face_embeddings (lecturer_id);
"""


def init_lecturer_tables():
    """Create the lecturer tables in PostgreSQL (safe to run every time)."""
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(LECTURER_SCHEMA_SQL)


init_lecturer_tables()


class LecturerRegistration(BaseModel):
    lecturer_id: str
    name: str
    email: EmailStr
    department: str


@router.post("/lecturers/register")
def register_lecturer(data: LecturerRegistration):
    if not all([data.lecturer_id.strip(), data.name.strip(), data.department.strip()]):
        raise HTTPException(status_code=400, detail="All fields are required")

    try:
        with db_conn() as conn:
            conn.cursor().execute(
                """
                INSERT INTO lecturers (lecturer_id, name, email, department, created_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    data.lecturer_id.strip(),
                    data.name.strip(),
                    data.email,
                    data.department.strip(),
                    datetime.now(timezone.utc),
                ),
            )
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="Lecturer ID or email already exists")

    return {
        "message": "Lecturer registered successfully",
        "lecturer_id": data.lecturer_id,
        "status": "success",
    }


@router.get("/lecturers/{lecturer_id}")
def get_lecturer(lecturer_id: str):
    with db_conn() as conn:
        cur = dict_cursor(conn)
        cur.execute(
            "SELECT lecturer_id, name, email, department, created_at "
            "FROM lecturers WHERE lecturer_id = %s",
            (lecturer_id,),
        )
        lecturer = cur.fetchone()

    if lecturer is None:
        raise HTTPException(status_code=404, detail="Lecturer not found")

    result = dict(lecturer)
    result["created_at"] = result["created_at"].isoformat()
    return result


@router.post("/lecturers/{lecturer_id}/face")
async def enroll_lecturer_face(lecturer_id: str, file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Upload a JPG or PNG image")

    image_bytes = await file.read()
    if not image_bytes or len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Invalid image or image exceeds 10 MB")

    with db_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT lecturer_id FROM lecturers WHERE lecturer_id = %s", (lecturer_id,))
        lecturer = cur.fetchone()

    if lecturer is None:
        raise HTTPException(status_code=404, detail="Lecturer not registered")

    image = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    try:
        faces = face_model.detect_faces(image)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Face processing failed") from exc

    if len(faces) != 1:
        raise HTTPException(status_code=400, detail="Upload an image containing exactly one face")

    face = faces[0]
    x1, y1, x2, y2 = face.bbox.astype(int)
    if x2 - x1 < MIN_FACE_SIZE or y2 - y1 < MIN_FACE_SIZE:
        raise HTTPException(status_code=400, detail="Face is too small")

    if face_model.face_sharpness(image, face) < BLUR_THRESHOLD:
        raise HTTPException(status_code=400, detail="Image is blurry. Capture a clearer photograph.")

    try:
        embedding = face_model.embed_face(image, face)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Face processing failed") from exc

    if embedding.shape[0] != 512:
        raise HTTPException(status_code=500, detail="Invalid embedding dimensions")

    with db_conn() as conn:
        conn.cursor().execute(
            """
            INSERT INTO lecturer_face_embeddings (lecturer_id, embedding, created_at)
            VALUES (%s, %s, %s)
            """,
            (
                lecturer_id,
                psycopg2.Binary(np.asarray(embedding, dtype=np.float32).tobytes()),
                datetime.now(timezone.utc),
            ),
        )

    return {
        "message": "Lecturer face enrolled successfully",
        "lecturer_id": lecturer_id,
        "embedding_dimensions": 512,
        "model": face_model.MODEL_NAME,
        "status": "success",
    }
