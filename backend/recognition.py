from fastapi import APIRouter, UploadFile, File, HTTPException
import cv2
import numpy as np

from db import db_conn
import face_model

router = APIRouter()

# Threshold comes from the trained model's .json (0.261 for casia_iresnet50, tuned on LFW).
# Re-tune with consented classroom images. Override with the FACE_THRESHOLD environment variable.
SIMILARITY_THRESHOLD = face_model.THRESHOLD
MAX_IMAGE_SIZE = 10 * 1024 * 1024


def recognize_class_image(class_name: str, image):
    """Recognize enrolled students in an already-decoded OpenCV image."""
    with db_conn() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.student_id, s.name, e.embedding
            FROM students s
            JOIN student_face_embeddings e
                ON s.student_id = e.student_id
            WHERE s.class_name = %s
        """, (class_name,))
        rows = cursor.fetchall()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="No enrolled face data found for this class"
        )

    student_data = {}
    for student_id, name, embedding_bytes in rows:
        student_data.setdefault(
            student_id, {"name": name, "embeddings": []}
        )
        student_data[student_id]["embeddings"].append(
            np.frombuffer(bytes(embedding_bytes), dtype=np.float32)
        )

    try:
        detected_faces = face_model.detect_faces(image)
        query_embeddings = [face_model.embed_face(image, f) for f in detected_faces]
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Face recognition processing failed"
        ) from exc

    present = []
    unknown = []
    duplicate_matches = []
    already_matched = set()

    for index, face in enumerate(detected_faces):
        query_embedding = query_embeddings[index]

        best_student = None
        best_score = -1.0

        for student_id, data in student_data.items():
            student_score = max(
                float(np.dot(query_embedding, stored_embedding))
                for stored_embedding in data["embeddings"]
            )
            if student_score > best_score:
                best_score = student_score
                best_student = student_id

        if best_score < SIMILARITY_THRESHOLD:
            unknown.append({
                "face_number": index + 1,
                "reason": "No sufficiently similar enrolled face"
            })
            continue

        if best_student in already_matched:
            duplicate_matches.append({
                "face_number": index + 1,
                "student_id": best_student,
                "name": student_data[best_student]["name"]
            })
            continue

        already_matched.add(best_student)
        present.append({
            "student_id": best_student,
            "name": student_data[best_student]["name"],
            "similarity_score": round(best_score, 4),
            "confidence": round(face_model.confidence(best_score), 4)
        })

    return {
        "class_name": class_name,
        "model": face_model.MODEL_NAME,
        "threshold": SIMILARITY_THRESHOLD,
        "total_faces_detected": len(detected_faces),
        "total_students_matched": len(present),
        "unknown_faces": len(unknown),
        "duplicate_matches": len(duplicate_matches),
        "present_students": present,
        "unrecognized_faces": unknown,
        "duplicate_details": duplicate_matches
    }


@router.post("/recognize/{class_name}")
async def recognize_class(
    class_name: str,
    file: UploadFile = File(...)
):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail="Upload a JPG or PNG image"
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image must be below 10 MB"
        )

    image_array = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file"
        )

    return recognize_class_image(class_name, image)
