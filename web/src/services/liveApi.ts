/**
 * Live connection to the FastAPI + PostgreSQL backend (real face recognition).
 * ---------------------------------------------------------------------------
 * Turned on with  VITE_LIVE_BACKEND=true  (see .env.example).
 * VITE_BACKEND_URL = backend address, e.g. http://127.0.0.1:8000 during local
 * development. Leave it empty when the website is served by the backend itself
 * (the hosted version), so requests go to the same address.
 *
 * Backend endpoints used:
 *   GET   /students                                    roster (all classes)
 *   POST  /students                                    register a student
 *   POST  /students/{id}/faces                         enroll one face photo
 *   POST  /attendance/mark-from-recognition/{class}    whole-class photo -> attendance (saved)
 *   POST  /recognize/{class}                           recognise a row photo (not saved)
 *   POST  /attendance/mark                             save the merged present list
 *   PATCH /attendance/correct/{id}                     correction within the 1-hour window (audited)
 */
import type {
  AnalyzePhotoPayload,
  AttendanceSession,
  CourseClass,
  EnrolledStudent,
  RowUploadPayload,
  StudentAttendanceRecord,
  SubjectItem,
  UnknownFaceDetection,
  User,
} from '../types/attendance';

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env || {};

export const LIVE_BACKEND = env.VITE_LIVE_BACKEND === 'true';
export const BACKEND_URL = (env.VITE_BACKEND_URL || '').replace(/\/+$/, '');

const LIVE_LECTURER_ID = 'usr-lec-101';
const LIVE_LECTURER_NAME = 'Dr. Kavita Nair';

interface BackendStudent {
  student_id: string;
  name: string;
  email: string | null;
  class_name: string;
}

interface RecognizedStudent {
  student_id: string;
  name: string;
  similarity_score: number;
  confidence?: number;
}

interface RecognitionResult {
  class_name: string;
  model?: string;
  threshold?: number;
  total_faces_detected: number;
  total_students_matched: number;
  unknown_faces: number;
  duplicate_matches: number;
  present_students: RecognizedStudent[];
  unrecognized_faces: { face_number: number; reason: string; similarity_score?: number; confidence?: number }[];
  duplicate_details: { face_number: number; student_id: string; name: string }[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, init);
  } catch {
    throw new Error(
      `Cannot reach the attendance server${BACKEND_URL ? ` at ${BACKEND_URL}` : ''}. Check that the backend is running.`
    );
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail =
      body && typeof body === 'object' && 'detail' in body
        ? (body as { detail: unknown }).detail
        : body;
    const msg =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => (d && typeof d === 'object' && 'msg' in d ? (d as { msg: string }).msg : String(d))).join('; ')
          : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

/** Turns a preview URL (blob:, data:, or same-origin path) back into an uploadable file. */
async function urlToFile(url: string, fileName: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  let type = blob.type;
  if (type !== 'image/jpeg' && type !== 'image/png') {
    type = /\.png$/i.test(fileName) ? 'image/png' : 'image/jpeg';
  }
  if (!/\.(jpe?g|png)$/i.test(fileName)) fileName = `${fileName || 'photo'}.jpg`;
  return new File([blob], fileName, { type });
}

const pct = (c: number | undefined | null) =>
  c === undefined || c === null ? null : Number((c * 100).toFixed(1));

function to12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

// ---------------------------------------------------------------- roster

export async function fetchLiveRoster(): Promise<{
  classes: CourseClass[];
  subjects: SubjectItem[];
  students: EnrolledStudent[];
}> {
  const data = await request<{ students: BackendStudent[] }>('/students');
  const byClass = new Map<string, BackendStudent[]>();
  for (const s of data.students) {
    if (!byClass.has(s.class_name)) byClass.set(s.class_name, []);
    byClass.get(s.class_name)!.push(s);
  }

  const classes: CourseClass[] = [];
  const subjects: SubjectItem[] = [];
  const students: EnrolledStudent[] = [];

  for (const [className, list] of byClass) {
    classes.push(makeLiveClass(className, list.length));
    subjects.push(makeLiveSubject(className));
    list.forEach((s, i) =>
      students.push({
        id: s.student_id,
        academicYear: '1st PUC',
        classId: className,
        rollNumber: s.student_id,
        name: s.name,
        program: 'Science (PCMC)',
        section: 'Live',
        defaultRow: `Row ${Math.min(3, Math.floor(i / 7) + 1)} (${['Front', 'Middle', 'Rear'][Math.min(2, Math.floor(i / 7))]})`,
        enrollmentStatus: 'Enrolled',
      })
    );
  }
  return { classes, subjects, students };
}

export function makeLiveClass(className: string, enrolledCount = 0): CourseClass {
  return {
    id: className,
    academicYear: '1st PUC',
    stream: 'Science (PCMC)',
    code: className,
    name: `${className} (Live face recognition)`,
    section: 'Live',
    department: 'Face ID backend',
    room: 'Live',
    schedule: 'Any time',
    enrolledCount,
    lecturerId: LIVE_LECTURER_ID,
    lecturerName: LIVE_LECTURER_NAME,
    isLive: true,
  };
}

export function makeLiveSubject(className: string): SubjectItem {
  return {
    id: `sub-live-${className}`,
    code: 'LIVE',
    name: `${className} lecture`,
    academicYear: '1st PUC',
    stream: 'Science (PCMC)',
    classId: className,
    lecturerId: LIVE_LECTURER_ID,
    lecturerName: LIVE_LECTURER_NAME,
    weeklyHours: 4,
  };
}

export async function registerLiveStudent(studentId: string, name: string, className: string) {
  return request('/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, name, class_name: className }),
  });
}

export async function enrollLiveFace(studentId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file, file.name);
  const res = await request<{ message: string; blur_score?: number }>(
    `/students/${encodeURIComponent(studentId)}/faces`,
    { method: 'POST', body: form }
  );
  return res.message;
}

// ---------------------------------------------------------------- attendance

function buildSession(
  rec: RecognitionResult,
  payload: AnalyzePhotoPayload,
  lecturer: User,
  course: CourseClass,
  subject: SubjectItem,
  roster: EnrolledStudent[],
  markedAt: string,
  threshold: number,
  editWindowMinutes: number
): AttendanceSession {
  const found = new Map(rec.present_students.map((p) => [p.student_id, p]));
  const duplicateIds = new Set(rec.duplicate_details.map((d) => d.student_id));

  const students: StudentAttendanceRecord[] = roster.map((s) => {
    const hit = found.get(s.id);
    const conf = hit ? pct(hit.confidence ?? null) : null;
    return {
      id: s.id,
      rollNumber: s.rollNumber,
      name: s.name,
      status: hit ? 'present' : 'absent',
      confidence: conf,
      rowLabel: s.defaultRow,
      matchWarning: duplicateIds.has(s.id)
        ? 'duplicate_match'
        : conf !== null && conf < threshold
          ? 'low_confidence'
          : null,
      manuallyEdited: false,
    };
  });

  const unknownFaces: UnknownFaceDetection[] = rec.unrecognized_faces.map((u) => ({
    id: `unk-${Date.now()}-${u.face_number}`,
    rowLabel: 'Classroom photo',
    confidence: pct(u.confidence ?? 0) ?? 0,
    regionLabel: `Face #${u.face_number} · best similarity ${u.similarity_score?.toFixed(3) ?? 'n/a'} (below threshold)`,
    resolutionStatus: 'unresolved',
  }));

  const presentScores = students.filter((s) => s.confidence !== null).map((s) => s.confidence as number);
  const averageConfidence = presentScores.length
    ? Number((presentScores.reduce((a, b) => a + b, 0) / presentScores.length).toFixed(1))
    : 0;
  const presentCount = students.filter((s) => s.status === 'present').length;
  const mismatch = rec.total_faces_detected !== rec.total_students_matched;

  return {
    id: `ses-live-${Date.now().toString().slice(-6)}`,
    academicYear: course.academicYear,
    classId: course.id,
    classCode: course.code,
    className: course.name,
    subjectCode: subject.code,
    subjectName: subject.name,
    topicName: payload.topicName.trim(),
    section: course.section,
    room: course.room,
    date: payload.sessionDate,
    startTime: payload.sessionTime ? to12h(payload.sessionTime) : '',
    capturedAt: markedAt,
    lockDeadline: new Date(new Date(markedAt).getTime() + editWindowMinutes * 60000).toISOString(),
    lecturerId: lecturer.id,
    lecturerName: lecturer.name,
    enrolledCount: roster.length,
    presentCount,
    absentCount: roster.length - presentCount,
    unknownCount: unknownFaces.length,
    detectedFaceCount: rec.total_faces_detected,
    averageConfidence,
    hasRowUploads: false,
    rowUploads: [],
    warnings: {
      lowConfidence: averageConfidence < threshold,
      unknownFacesCount: unknownFaces.length,
      duplicateMatches: rec.duplicate_details.map((d) => `${d.student_id} · ${d.name} (face #${d.face_number})`),
      headcountMismatch: mismatch
        ? { expectedPresent: presentCount, detectedFaces: rec.total_faces_detected, enrolledTotal: roster.length }
        : null,
    },
    students,
    unknownFaces,
    isLive: true,
  };
}

export async function analyzeLivePhoto(
  payload: AnalyzePhotoPayload,
  lecturer: User,
  course: CourseClass,
  subject: SubjectItem,
  roster: EnrolledStudent[],
  threshold: number,
  editWindowMinutes: number
): Promise<AttendanceSession> {
  if (!payload.photoUrl) throw new Error('Please capture or upload a classroom photograph first.');
  const file = await urlToFile(payload.photoUrl, payload.photoFileName);
  const form = new FormData();
  form.append('file', file, file.name);

  const query = new URLSearchParams({ attendance_date: payload.sessionDate, confirm_review: 'true' });
  const res = await request<{
    recognition: RecognitionResult;
    attendance: { marked_at: string } | null;
  }>(`/attendance/mark-from-recognition/${encodeURIComponent(course.id)}?${query}`, {
    method: 'POST',
    body: form,
  });

  return buildSession(
    res.recognition,
    payload,
    lecturer,
    course,
    subject,
    roster,
    res.attendance?.marked_at || new Date().toISOString(),
    threshold,
    editWindowMinutes
  );
}

export async function uploadLiveRowPhoto(
  session: AttendanceSession,
  payload: RowUploadPayload,
  threshold: number
): Promise<AttendanceSession> {
  if (!payload.photoUrl) throw new Error('Please capture or upload the row photo first.');
  const file = await urlToFile(payload.photoUrl, payload.photoFileName);
  const form = new FormData();
  form.append('file', file, file.name);
  const rec = await request<RecognitionResult>(`/recognize/${encodeURIComponent(session.classId)}`, {
    method: 'POST',
    body: form,
  });

  const found = new Map(rec.present_students.map((p) => [p.student_id, p]));
  let facesImproved = 0;
  const students = session.students.map((s) => {
    const hit = found.get(s.id);
    if (!hit) return s;
    const conf = pct(hit.confidence ?? null);
    const better = s.status === 'absent' || (s.confidence ?? 0) < (conf ?? 0);
    if (!better) return s;
    facesImproved += 1;
    return {
      ...s,
      status: 'present' as const,
      confidence: conf,
      matchWarning: conf !== null && conf < threshold ? ('low_confidence' as const) : null,
    };
  });

  // Save the merged present list (overwrites within the edit window; changes are audited).
  await request('/attendance/mark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      class_name: session.classId,
      attendance_date: session.date,
      present_student_ids: students.filter((s) => s.status === 'present').map((s) => s.id),
    }),
  });

  const scores = students.filter((s) => s.confidence !== null).map((s) => s.confidence as number);
  const averageConfidence = scores.length
    ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
    : session.averageConfidence;
  const presentCount = students.filter((s) => s.status === 'present').length;
  const rowScores = rec.present_students.map((p) => pct(p.confidence ?? null) ?? 0);

  return {
    ...session,
    students,
    presentCount,
    absentCount: students.length - presentCount,
    averageConfidence,
    hasRowUploads: true,
    rowUploads: [
      ...session.rowUploads,
      {
        rowNumber: payload.rowNumber,
        rowLabel: payload.rowLabel,
        fileName: payload.photoFileName,
        uploadedAt: new Date().toISOString(),
        averageConfidence: rowScores.length
          ? Number((rowScores.reduce((a, b) => a + b, 0) / rowScores.length).toFixed(1))
          : 0,
        facesImproved,
      },
    ],
    warnings: { ...session.warnings, lowConfidence: averageConfidence < threshold },
  };
}

export async function correctLiveAttendance(
  session: AttendanceSession,
  studentId: string,
  newStatus: 'present' | 'absent',
  editedBy: string,
  reason: string
) {
  const query = new URLSearchParams({ class_name: session.classId, attendance_date: session.date });
  return request(`/attendance/correct/${encodeURIComponent(studentId)}?${query}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      new_status: newStatus === 'present' ? 'Present' : 'Absent',
      edited_by: editedBy,
      reason,
    }),
  });
}
