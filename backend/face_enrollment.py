
from fastapi import APIRouter, UploadFile, File, HTTPException
import cv2
import numpy as np
import psycopg2

from db import db_conn
import face_model

router = APIRouter()

MAX_IMAGE_SIZE = 10 * 1024 * 1024
MIN_FACE_SIZE = 80
BLUR_THRESHOLD = 30.0   # on the aligned 112x112 face (model team default)

class _CompatModel:
    """Old code called get_face_model().get(image). This keeps that working,
    but detection + embedding now come from face_model.py (the team's trained model)."""

    def get(self, image):
        faces = face_model.detect_faces(image)
        for f in faces:
            f.normed_embedding = face_model.embed_face(image, f)
        return faces


_compat = _CompatModel()


def get_face_model():
    return _compat


@router.post("/students/{student_id}/faces")
async def enroll_student_face(
    student_id: str,
    file: UploadFile = File(...)
):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail="Upload a JPG or PNG image"
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty"
        )

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image size must be below 10 MB"
        )

    with db_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT student_id FROM students WHERE student_id = %s",
            (student_id,)
        )
        student = cur.fetchone()

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not registered"
        )

    image_array = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file"
        )

    try:
        faces = face_model.detect_faces(image)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Face recognition model could not process image"
        ) from exc

    if len(faces) == 0:
        raise HTTPException(
            status_code=400,
            detail="No face detected. Upload a clearer image."
        )

    if len(faces) > 1:
        raise HTTPException(
            status_code=400,
            detail="Multiple faces detected. Upload one person's image."
        )

    face = faces[0]

    x1, y1, x2, y2 = face.bbox.astype(int)
    face_width = x2 - x1
    face_height = y2 - y1

    if face_width < MIN_FACE_SIZE or face_height < MIN_FACE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Face is too small. Move closer to the camera."
        )

    # Sharpness of the aligned 112x112 face the model actually sees
    # (same measure as the model team's tool; independent of photo size).
    blur_score = face_model.face_sharpness(image, face)

    if blur_score < BLUR_THRESHOLD:
        raise HTTPException(
            status_code=400,
            detail="Image is blurry. Capture a clearer photograph."
        )

    try:
        embedding = face_model.embed_face(image, face).tolist()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Face recognition model could not process image"
        ) from exc

    if len(embedding) != 512:
        raise HTTPException(
            status_code=500,
            detail="Unexpected face embedding dimensions"
        )

    # Store the 512 numbers as raw float32 bytes (about 2 KB)
    embedding_bytes = np.asarray(embedding, dtype=np.float32).tobytes()

    with db_conn() as conn:
        conn.cursor().execute("""
            INSERT INTO student_face_embeddings (student_id, embedding)
            VALUES (%s, %s)
        """, (student_id, psycopg2.Binary(embedding_bytes)))

    return {
        "message": "Face enrolled successfully",
        "student_id": student_id,
        "embedding_dimensions": len(embedding),
        "face_width": int(face_width),
        "face_height": int(face_height),
        "blur_score": round(float(blur_score), 2),
        "model": face_model.MODEL_NAME,
        "status": "success"
    }
