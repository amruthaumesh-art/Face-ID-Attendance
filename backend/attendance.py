from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from datetime import date, datetime, timezone
import cv2
import numpy as np

from db import db_conn, dict_cursor
from recognition import recognize_class_image

router = APIRouter()
MAX_IMAGE_SIZE = 10 * 1024 * 1024
EDIT_WINDOW_SECONDS = 3600


# ==========================================
# REQUEST MODELS
# ==========================================

class AttendanceRequest(BaseModel):
    class_name: str
    present_student_ids: list[str]
    attendance_date: date


class AttendanceCorrection(BaseModel):
    new_status: str
    edited_by: str
    reason: str


# ==========================================
# SHARED ATTENDANCE SAVE FUNCTION
# ==========================================

def _as_datetime(value):
    if value is None:
        return None
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def _is_locked(marked_at, now: datetime) -> bool:
    """A record is locked once its edit window has passed."""
    marked_time = _as_datetime(marked_at)
    if marked_time is None:
        return True  # unknown timestamp: be safe and lock it
    return (now - marked_time).total_seconds() > EDIT_WINDOW_SECONDS


def save_class_attendance(
    class_name: str,
    attendance_date: date,
    present_student_ids: list[str],
    edited_by: str = "system"
):
    if len(present_student_ids) != len(set(present_student_ids)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate student IDs supplied"
        )

    try:
        with db_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT student_id FROM students WHERE class_name = %s",
                (class_name,)
            )
            students = [row[0] for row in cursor.fetchall()]

            if not students:
                raise HTTPException(
                    status_code=404,
                    detail="No students registered in this class"
                )

            invalid_ids = set(present_student_ids) - set(students)
            if invalid_ids:
                raise HTTPException(
                    status_code=400,
                    detail="Some student IDs do not belong to this class"
                )

            present_ids = set(present_student_ids)
            now = datetime.now(timezone.utc)

            cursor.execute("""
                SELECT student_id, status, marked_at
                FROM attendance
                WHERE class_name = %s AND attendance_date = %s
            """, (class_name, attendance_date))
            existing = {row[0]: (row[1], row[2]) for row in cursor.fetchall()}

            # LOCK: once the 1-hour window has passed, nothing may overwrite it.
            if any(_is_locked(m, now) for _, m in existing.values()):
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Attendance for this class and date is locked "
                        "(1-hour edit window expired). Contact the admin."
                    )
                )

            for student_id in students:
                status = "Present" if student_id in present_ids else "Absent"
                old = existing.get(student_id)

                # Overwrite inside the window: audit every change. The
                # ORIGINAL marked_at is kept so the window does not restart.
                if old is not None and old[0] != status:
                    cursor.execute("""
                        INSERT INTO attendance_audit (
                            student_id, class_name, attendance_date,
                            old_status, new_status, edited_by,
                            reason, edited_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        student_id,
                        class_name,
                        attendance_date,
                        old[0],
                        status,
                        edited_by,
                        "Attendance re-submitted within edit window",
                        now
                    ))

                cursor.execute("""
                    INSERT INTO attendance (
                        student_id, class_name, attendance_date,
                        status, marked_at
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (student_id, class_name, attendance_date)
                    DO UPDATE SET status = EXCLUDED.status
                """, (
                    student_id,
                    class_name,
                    attendance_date,
                    status,
                    now
                ))

            return {
                "message": "Attendance recorded successfully",
                "class_name": class_name,
                "date": attendance_date.isoformat(),
                "total_students": len(students),
                "present": len(present_ids),
                "absent": len(students) - len(present_ids),
                "marked_at": now.isoformat()
            }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not save attendance"
        ) from exc


# ==========================================
# 1. MANUAL ATTENDANCE
# ==========================================

@router.post("/attendance/mark")
def mark_attendance(data: AttendanceRequest):
    return save_class_attendance(
        data.class_name,
        data.attendance_date,
        data.present_student_ids
    )


# ==========================================
# 2. AUTOMATIC ATTENDANCE USING FACE RECOGNITION
# ==========================================

@router.post("/attendance/mark-from-recognition/{class_name}")
async def mark_attendance_from_recognition(
    class_name: str,
    file: UploadFile = File(...),
    attendance_date: date | None = None,
    confirm_review: bool = False
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

    recognition_result = recognize_class_image(class_name, image)
    present_student_ids = [
        student["student_id"]
        for student in recognition_result["present_students"]
    ]

    # Do not mark everyone absent if no enrolled student was recognized.
    if not present_student_ids:
        raise HTTPException(
            status_code=422,
            detail=(
                "No enrolled students were recognized. "
                "Attendance was not saved."
            )
        )

    # Any flag means the lecturer must review before anything is saved.
    review_reasons = []
    if recognition_result["unknown_faces"] > 0:
        review_reasons.append(
            f"{recognition_result['unknown_faces']} unknown face(s)"
        )
    if recognition_result["duplicate_matches"] > 0:
        review_reasons.append(
            f"{recognition_result['duplicate_matches']} duplicate match(es)"
        )
    if (
        recognition_result["total_faces_detected"]
        != recognition_result["total_students_matched"]
    ):
        review_reasons.append(
            f"head count mismatch: "
            f"{recognition_result['total_faces_detected']} faces found but "
            f"{recognition_result['total_students_matched']} students matched"
        )

    if review_reasons and not confirm_review:
        return {
            "message": "Review required. Attendance was NOT saved",
            "saved": False,
            "review_required": True,
            "review_reasons": review_reasons,
            "recognition": recognition_result,
            "attendance": None
        }

    selected_date = attendance_date or date.today()
    attendance_result = save_class_attendance(
        class_name,
        selected_date,
        present_student_ids,
        edited_by="face-recognition"
    )

    return {
        "message": "Face recognition completed and attendance saved",
        "saved": True,
        "review_required": False,
        "review_reasons": review_reasons,
        "recognition": recognition_result,
        "attendance": attendance_result
    }


# ==========================================
# 2b. ROW-WISE PHOTOS (fallback when one class photo is not accurate)
# ==========================================

MAX_ROW_PHOTOS = 10


def _decode_upload(image_bytes: bytes):
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Each image must be below 10 MB"
        )
    image = cv2.imdecode(
        np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR
    )
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file")
    return image


def merge_recognitions(class_name: str, results: list[dict]) -> dict:
    """Merge several photos. A student seen in more than one photo
    (overlap between rows) counts once, keeping the best score."""
    best: dict[str, dict] = {}
    for result in results:
        for student in result["present_students"]:
            current = best.get(student["student_id"])
            if (
                current is None
                or student["similarity_score"] > current["similarity_score"]
            ):
                best[student["student_id"]] = student

    return {
        "class_name": class_name,
        "photos_processed": len(results),
        "total_faces_detected": sum(
            r["total_faces_detected"] for r in results
        ),
        "total_students_matched": len(best),
        "unknown_faces": sum(r["unknown_faces"] for r in results),
        "duplicate_matches": sum(r["duplicate_matches"] for r in results),
        "present_students": list(best.values()),
        "per_photo": [
            {
                "faces": r["total_faces_detected"],
                "matched": r["total_students_matched"],
                "unknown": r["unknown_faces"],
                "duplicates": r["duplicate_matches"]
            }
            for r in results
        ]
    }


@router.post("/attendance/mark-from-rows/{class_name}")
async def mark_attendance_from_rows(
    class_name: str,
    files: list[UploadFile] = File(...),
    attendance_date: date | None = None,
    confirm_review: bool = False
):
    if not files or len(files) > MAX_ROW_PHOTOS:
        raise HTTPException(
            status_code=400,
            detail=f"Upload 1 to {MAX_ROW_PHOTOS} row photos"
        )

    results = []
    for upload in files:
        if upload.content_type not in ["image/jpeg", "image/png"]:
            raise HTTPException(
                status_code=400,
                detail="Upload JPG or PNG images only"
            )
        image = _decode_upload(await upload.read())
        results.append(recognize_class_image(class_name, image))

    merged = merge_recognitions(class_name, results)

    if not merged["present_students"]:
        raise HTTPException(
            status_code=422,
            detail=(
                "No enrolled students were recognized. "
                "Attendance was not saved."
            )
        )

    # Faces vs matches cannot be compared across overlapping photos,
    # so only unknown and duplicate faces trigger review here.
    review_reasons = []
    if merged["unknown_faces"] > 0:
        review_reasons.append(f"{merged['unknown_faces']} unknown face(s)")
    if merged["duplicate_matches"] > 0:
        review_reasons.append(
            f"{merged['duplicate_matches']} duplicate match(es)"
        )

    if review_reasons and not confirm_review:
        return {
            "message": "Review required. Attendance was NOT saved",
            "saved": False,
            "review_required": True,
            "review_reasons": review_reasons,
            "recognition": merged,
            "attendance": None
        }

    attendance_result = save_class_attendance(
        class_name,
        attendance_date or date.today(),
        [s["student_id"] for s in merged["present_students"]],
        edited_by="face-recognition-rows"
    )

    return {
        "message": "Row-wise recognition completed and attendance saved",
        "saved": True,
        "review_required": False,
        "review_reasons": review_reasons,
        "recognition": merged,
        "attendance": attendance_result
    }


# ==========================================
# 3. VIEW ATTENDANCE AUDIT HISTORY
# Keep this route before the dynamic attendance route.
# ==========================================

@router.get("/attendance/audit/{student_id}")
def get_attendance_audit(student_id: str):
    with db_conn() as conn:
        cursor = dict_cursor(conn)
        cursor.execute("""
            SELECT *
            FROM attendance_audit
            WHERE student_id = %s
            ORDER BY edited_at DESC
        """, (student_id,))
        records = [dict(row) for row in cursor.fetchall()]

    return {
        "student_id": student_id,
        "total_changes": len(records),
        "history": records
    }


# ==========================================
# 4. VIEW ATTENDANCE
# ==========================================

@router.get("/attendance/{class_name}/{attendance_date}")
def get_attendance(class_name: str, attendance_date: date):
    with db_conn() as conn:
        cursor = dict_cursor(conn)
        cursor.execute("""
            SELECT
                s.student_id,
                s.name,
                a.status,
                a.attendance_date,
                a.marked_at
            FROM attendance a
            JOIN students s ON a.student_id = s.student_id
            WHERE a.class_name = %s
              AND a.attendance_date = %s
            ORDER BY s.name
        """, (class_name, attendance_date))
        records = [dict(row) for row in cursor.fetchall()]

    return {
        "class_name": class_name,
        "date": attendance_date.isoformat(),
        "total_students": len(records),
        "records": records
    }


# ==========================================
# 5. LECTURER ATTENDANCE CORRECTION
# ==========================================

@router.patch("/attendance/correct/{student_id}")
def correct_attendance(
    student_id: str,
    class_name: str,
    attendance_date: date,
    data: AttendanceCorrection
):
    if data.new_status not in ["Present", "Absent"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be Present or Absent"
        )

    if not data.edited_by.strip() or not data.reason.strip():
        raise HTTPException(
            status_code=400,
            detail="Editor and correction reason are required"
        )

    try:
        with db_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT status, marked_at
                FROM attendance
                WHERE student_id = %s
                  AND class_name = %s
                  AND attendance_date = %s
            """, (student_id, class_name, attendance_date))

            record = cursor.fetchone()
            if record is None:
                raise HTTPException(
                    status_code=404,
                    detail="Attendance record not found"
                )

            old_status, marked_at = record
            if not marked_at:
                raise HTTPException(
                    status_code=400,
                    detail="Attendance timestamp unavailable"
                )

            now = datetime.now(timezone.utc)
            elapsed_seconds = (now - _as_datetime(marked_at)).total_seconds()

            if elapsed_seconds < 0 or elapsed_seconds > EDIT_WINDOW_SECONDS:
                raise HTTPException(
                    status_code=403,
                    detail="One-hour correction window has expired"
                )

            if old_status == data.new_status:
                raise HTTPException(
                    status_code=400,
                    detail="Attendance already has this status"
                )

            cursor.execute("""
                UPDATE attendance
                SET status = %s
                WHERE student_id = %s
                  AND class_name = %s
                  AND attendance_date = %s
            """, (data.new_status, student_id, class_name, attendance_date))

            cursor.execute("""
                INSERT INTO attendance_audit (
                    student_id, class_name, attendance_date,
                    old_status, new_status, edited_by,
                    reason, edited_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                student_id,
                class_name,
                attendance_date,
                old_status,
                data.new_status,
                data.edited_by.strip(),
                data.reason.strip(),
                now
            ))

            return {
                "message": "Attendance corrected successfully",
                "student_id": student_id,
                "old_status": old_status,
                "new_status": data.new_status,
                "edited_by": data.edited_by.strip(),
                "reason": data.reason.strip(),
                "edited_at": now.isoformat()
            }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Attendance correction failed"
        ) from exc
