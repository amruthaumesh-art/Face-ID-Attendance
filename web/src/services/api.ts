import {
  COURSE_CLASSES,
  DEMO_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_LECTURERS,
  INITIAL_SESSIONS,
  INITIAL_STUDENTS,
  INITIAL_SUBJECTS,
} from '../data/mockData';
import type {
  AcademicYear,
  AnalyzePhotoPayload,
  AttendanceSession,
  AuditLogEntry,
  CourseClass,
  EnrolledStudent,
  LecturerProfile,
  RowUploadPayload,
  StudentAttendanceRecord,
  SubjectItem,
  UnknownFaceDetection,
  User,
  UserRole,
} from '../types/attendance';
import {
  LIVE_BACKEND,
  analyzeLivePhoto,
  fetchLiveRoster,
  uploadLiveRowPhoto,
} from './liveApi';

export { LIVE_BACKEND } from './liveApi';

/**
 * FastAPI + PostgreSQL Ready API Client Layer
 * ---------------------------------------------------------------------------
 * Set VITE_API_BASE_URL in .env to connect to a live Python FastAPI backend.
 * Future AI team endpoints (SCRFD face detection & ArcFace recognition):
 *   - POST   /api/v1/auth/login
 *   - GET    /api/v1/classes?academic_year=1st%20PUC|2nd%20PUC
 *   - GET    /api/v1/subjects?academic_year=1st%20PUC|2nd%20PUC
 *   - GET    /api/v1/students?academic_year=1st%20PUC|2nd%20PUC
 *   - POST   /api/v1/attendance/analyze             (SCRFD + ArcFace pipeline)
 *   - POST   /api/v1/attendance/sessions/:id/row-upload
 *   - PATCH  /api/v1/attendance/sessions/:id/records/:studentId
 *   - GET    /api/v1/admin/audit-logs
 *
 * Sample (demo) classes run a deterministic client-side simulation.
 * Live classes (VITE_LIVE_BACKEND=true) call the real backend: see liveApi.ts.
 */

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isSessionLocked(session: AttendanceSession, nowMs: number = Date.now()): boolean {
  if (session.forceLocked) return true;
  return nowMs >= new Date(session.lockDeadline).getTime();
}

export function getRemainingEditMs(session: AttendanceSession, nowMs: number = Date.now()): number {
  if (session.forceLocked) return 0;
  return Math.max(0, new Date(session.lockDeadline).getTime() - nowMs);
}

export async function loginUser(
  email: string,
  password: string,
  role: UserRole
): Promise<{ user: User; token: string }> {
  await delay(300);
  if (!email.trim() || !password.trim()) {
    throw new Error('Please enter both institutional email and password.');
  }
  const baseUser = DEMO_USERS[role];
  return {
    user: {
      ...baseUser,
      email: email.trim(),
    },
    token: `demo-jwt-${role}-${Date.now()}`,
  };
}

export async function fetchClasses(role: UserRole, userId: string): Promise<CourseClass[]> {
  await delay(120);
  if (role === 'admin') return COURSE_CLASSES;
  return COURSE_CLASSES.filter((c) => c.lecturerId === userId);
}

export async function fetchInitialData(): Promise<{
  allClasses: CourseClass[];
  subjects: SubjectItem[];
  students: EnrolledStudent[];
  lecturers: LecturerProfile[];
  sessions: AttendanceSession[];
  auditLogs: AuditLogEntry[];
}> {
  await delay(150);
  const base = {
    allClasses: COURSE_CLASSES,
    subjects: INITIAL_SUBJECTS,
    students: INITIAL_STUDENTS,
    lecturers: INITIAL_LECTURERS,
    sessions: INITIAL_SESSIONS,
    auditLogs: INITIAL_AUDIT_LOGS,
  };
  if (!LIVE_BACKEND) return base;

  // Live mode: real classes and students from PostgreSQL come first,
  // followed by the sample (demo) classes.
  try {
    const live = await fetchLiveRoster();
    return {
      ...base,
      allClasses: [...live.classes, ...base.allClasses],
      subjects: [...live.subjects, ...base.subjects],
      students: [...live.students, ...base.students],
    };
  } catch (err) {
    console.warn('[FACE ID] Could not load live roster from backend:', err);
    return base;
  }
}

/**
 * Simulates FastAPI `POST /api/v1/attendance/analyze` (SCRFD + ArcFace placeholder).
 * Generates deterministic sample results without storing real biometric images.
 */
export async function analyzeClassroomPhoto(
  payload: AnalyzePhotoPayload,
  lecturer: User,
  context?: {
    classes?: CourseClass[];
    subjects?: SubjectItem[];
    allStudents?: EnrolledStudent[];
    confidenceThreshold?: number;
    editWindowMinutes?: number;
  }
): Promise<AttendanceSession> {
  await delay(600);

  const classesSource = context?.classes || COURSE_CLASSES;
  const subjectsSource = context?.subjects || INITIAL_SUBJECTS;
  const studentsSource = context?.allStudents || INITIAL_STUDENTS;
  const threshold = context?.confidenceThreshold ?? 95;
  const editWindowMinutes = context?.editWindowMinutes ?? 60;

  const course = classesSource.find(
    (c) => c.id === payload.classId && c.academicYear === payload.academicYear
  );
  if (!course) {
    throw new Error(`Selected ${payload.academicYear} class was not found.`);
  }

  const subject = subjectsSource.find((s) => s.id === payload.subjectId);
  if (!subject) {
    throw new Error('Selected subject was not found for this class.');
  }

  // Live classes: send the real photo to the backend (SCRFD + trained ArcFace model).
  if (course.isLive) {
    const liveRoster = studentsSource.filter(
      (s) => s.classId === course.id && s.enrollmentStatus !== 'Inactive'
    );
    return analyzeLivePhoto(
      payload,
      lecturer,
      course,
      subject,
      liveRoster,
      threshold,
      editWindowMinutes
    );
  }

  const roster = studentsSource.filter(
    (s) =>
      s.classId === course.id &&
      s.academicYear === payload.academicYear &&
      s.enrollmentStatus !== 'Inactive'
  );

  if (roster.length === 0) {
    throw new Error('No active enrolled students found in this class roster.');
  }

  const capturedAt = new Date().toISOString();
  const lockDeadline = new Date(Date.now() + editWindowMinutes * 60 * 1000).toISOString();

  let students: StudentAttendanceRecord[] = [];
  let unknownFaces: UnknownFaceDetection[] = [];
  let detectedFaceCount = 0;
  let averageConfidence = 97.4;
  let duplicateMatches: string[] = [];
  let headcountMismatch: AttendanceSession['warnings']['headcountMismatch'] = null;

  if (payload.scenario === 'high_confidence') {
    students = roster.map((s, idx) => {
      const isAbsent = idx === roster.length - 1 || idx === Math.floor(roster.length / 2);
      return {
        id: s.id,
        rollNumber: s.rollNumber,
        name: s.name,
        status: isAbsent ? 'absent' : 'present',
        confidence: isAbsent ? null : Number((96.1 + (idx % 4) * 0.9).toFixed(1)),
        rowLabel: s.defaultRow,
        matchWarning: null,
        manuallyEdited: false,
      };
    });
    const presentCount = students.filter((s) => s.status === 'present').length;
    detectedFaceCount = presentCount;
    averageConfidence = 97.5;
  } else if (payload.scenario === 'low_confidence_unknown') {
    students = roster.map((s, idx) => {
      const isAbsent = idx >= roster.length - 3;
      const isRearRow = s.defaultRow.includes('Row 3');
      const conf = isAbsent
        ? null
        : isRearRow
          ? Number((87.4 + (idx % 3) * 2.3).toFixed(1))
          : Number((95.4 + (idx % 3) * 0.8).toFixed(1));
      return {
        id: s.id,
        rollNumber: s.rollNumber,
        name: s.name,
        status: isAbsent ? 'absent' : 'present',
        confidence: conf,
        rowLabel: s.defaultRow,
        matchWarning: conf !== null && conf < threshold ? 'low_confidence' : null,
        manuallyEdited: false,
      };
    });
    unknownFaces = [
      {
        id: `unk-${Date.now()}-1`,
        rowLabel: 'Row 3 (Rear)',
        confidence: 62.5,
        regionLabel: 'Rear Left Bench · Partial Occlusion',
        resolutionStatus: 'unresolved',
      },
      {
        id: `unk-${Date.now()}-2`,
        rowLabel: 'Row 3 (Rear)',
        confidence: 58.9,
        regionLabel: 'Rear Center Bench · Low Illumination',
        resolutionStatus: 'unresolved',
      },
    ];
    const presentCount = students.filter((s) => s.status === 'present').length;
    detectedFaceCount = presentCount + unknownFaces.length;
    averageConfidence = 92.3;
    headcountMismatch = {
      expectedPresent: presentCount,
      detectedFaces: detectedFaceCount,
      enrolledTotal: roster.length,
    };
  } else {
    // duplicate_headcount_mismatch
    students = roster.map((s, idx) => {
      const isAbsent = idx === 4 || idx === roster.length - 2;
      const isDuplicate = idx === 2 || (roster.length > 6 && idx === 6);
      const isLow = idx >= roster.length - 4 && !isAbsent;
      const conf = isAbsent
        ? null
        : isLow
          ? Number((89.2 + (idx % 3) * 1.4).toFixed(1))
          : Number((94.8 + (idx % 3) * 0.9).toFixed(1));
      return {
        id: s.id,
        rollNumber: s.rollNumber,
        name: s.name,
        status: isAbsent ? 'absent' : 'present',
        confidence: conf,
        rowLabel: s.defaultRow,
        matchWarning: isDuplicate
          ? 'duplicate_match'
          : conf !== null && conf < threshold
            ? 'low_confidence'
            : null,
        manuallyEdited: false,
      };
    });
    if (roster[2]) duplicateMatches.push(`${roster[2].rollNumber} · ${roster[2].name}`);
    if (roster[6]) duplicateMatches.push(`${roster[6].rollNumber} · ${roster[6].name}`);
    unknownFaces = [
      {
        id: `unk-${Date.now()}-3`,
        rowLabel: 'Row 2 (Middle)',
        confidence: 66.1,
        regionLabel: 'Seat 2D · Side Profile',
        resolutionStatus: 'unresolved',
      },
    ];
    const presentCount = students.filter((s) => s.status === 'present').length;
    detectedFaceCount = presentCount + 3;
    averageConfidence = 93.4;
    headcountMismatch = {
      expectedPresent: presentCount,
      detectedFaces: detectedFaceCount,
      enrolledTotal: roster.length,
    };
  }

  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;

  const formattedStartTime = payload.sessionTime
    ? (() => {
        const [hStr, mStr] = payload.sessionTime.split(':');
        const h = Number(hStr);
        const m = Number(mStr);
        if (Number.isNaN(h) || Number.isNaN(m)) return payload.sessionTime;
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
      })()
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    id: `ses-${Date.now().toString().slice(-5)}`,
    academicYear: payload.academicYear,
    classId: course.id,
    classCode: course.code,
    className: course.name,
    subjectCode: subject.code,
    subjectName: subject.name,
    topicName: payload.topicName.trim(),
    section: course.section,
    room: course.room,
    date: payload.sessionDate || capturedAt.slice(0, 10),
    startTime: formattedStartTime,
    capturedAt,
    lockDeadline,
    lecturerId: lecturer.id,
    lecturerName: lecturer.name,
    enrolledCount: roster.length,
    presentCount,
    absentCount,
    unknownCount: unknownFaces.length,
    detectedFaceCount,
    averageConfidence,
    hasRowUploads: false,
    rowUploads: [],
    warnings: {
      lowConfidence: averageConfidence < threshold,
      unknownFacesCount: unknownFaces.length,
      duplicateMatches,
      headcountMismatch,
    },
    students,
    unknownFaces,
  };
}

/**
 * Simulates FastAPI `POST /api/v1/attendance/sessions/:id/row-upload`
 * Boosts confidence for students in the uploaded row and resolves row unknowns.
 */
export async function uploadRowPhotoVerification(
  session: AttendanceSession,
  payload: RowUploadPayload,
  confidenceThreshold: number = 95
): Promise<AttendanceSession> {
  if (session.isLive) {
    return uploadLiveRowPhoto(session, payload, confidenceThreshold);
  }
  await delay(480);

  let facesImproved = 0;
  const updatedStudents = session.students.map((student) => {
    const matchesRow = student.rowLabel?.includes(`Row ${payload.rowNumber}`);
    if (!matchesRow) return student;

    if (student.status === 'present' && (student.confidence ?? 100) < confidenceThreshold) {
      facesImproved += 1;
      return {
        ...student,
        confidence: Number((96.8 + (student.name.length % 3) * 0.7).toFixed(1)),
        matchWarning: student.matchWarning === 'low_confidence' ? null : student.matchWarning,
      };
    }
    return student;
  });

  const updatedUnknowns = session.unknownFaces.map((unk) => {
    if (unk.rowLabel.includes(`Row ${payload.rowNumber}`) && unk.resolutionStatus === 'unresolved') {
      return {
        ...unk,
        confidence: 95.8,
        resolutionStatus: 'dismissed' as const,
      };
    }
    return unk;
  });

  const presentScores = updatedStudents
    .filter((s) => s.status === 'present' && s.confidence !== null)
    .map((s) => s.confidence as number);

  const newAverage =
    presentScores.length > 0
      ? Number((presentScores.reduce((acc, v) => acc + v, 0) / presentScores.length).toFixed(1))
      : session.averageConfidence;

  const remainingUnknowns = updatedUnknowns.filter((u) => u.resolutionStatus === 'unresolved').length;

  const rowLog = {
    rowNumber: payload.rowNumber,
    rowLabel: payload.rowLabel,
    fileName: payload.photoFileName,
    uploadedAt: new Date().toISOString(),
    averageConfidence: 97.1,
    facesImproved: Math.max(1, facesImproved),
  };

  return {
    ...session,
    averageConfidence: newAverage,
    unknownCount: remainingUnknowns,
    hasRowUploads: true,
    rowUploads: [...session.rowUploads, rowLog],
    students: updatedStudents,
    unknownFaces: updatedUnknowns,
    warnings: {
      ...session.warnings,
      lowConfidence: newAverage < confidenceThreshold,
      unknownFacesCount: remainingUnknowns,
    },
  };
}

/**
 * Simulates FastAPI report aggregation per academic year (1st PUC or 2nd PUC).
 */
export function buildPucAttendanceReport(
  academicYear: AcademicYear,
  classes: CourseClass[],
  sessions: AttendanceSession[],
  students: EnrolledStudent[]
) {
  const yearClasses = classes.filter((c) => c.academicYear === academicYear);
  const yearSessions = sessions.filter((s) => s.academicYear === academicYear);
  const yearStudents = students.filter((st) => st.academicYear === academicYear);

  const classBreakdown = yearClasses.map((cls) => {
    const clsSessions = yearSessions.filter((s) => s.classId === cls.id);
    const totalPresent = clsSessions.reduce((sum, s) => sum + s.presentCount, 0);
    const totalExpected = clsSessions.reduce((sum, s) => sum + s.enrolledCount, 0);
    const attendancePct =
      totalExpected > 0 ? Number(((totalPresent / totalExpected) * 100).toFixed(1)) : 0;
    const avgConfidence =
      clsSessions.length > 0
        ? Number(
            (
              clsSessions.reduce((sum, s) => sum + s.averageConfidence, 0) /
              clsSessions.length
            ).toFixed(1)
          )
        : 0;
    return {
      classItem: cls,
      sessionsHeld: clsSessions.length,
      attendancePct,
      avgConfidence,
    };
  });

  const overallPct =
    yearSessions.length > 0
      ? Number(
          (
            yearSessions.reduce(
              (sum, s) => sum + (s.presentCount / Math.max(1, s.enrolledCount)) * 100,
              0
            ) / yearSessions.length
          ).toFixed(1)
        )
      : 0;

  return {
    academicYear,
    totalStudents: yearStudents.length,
    enrolledActive: yearStudents.filter((s) => s.enrollmentStatus === 'Enrolled').length,
    pendingPhotos: yearStudents.filter((s) => s.enrollmentStatus === 'Pending Photo').length,
    totalClasses: yearClasses.length,
    totalSessions: yearSessions.length,
    overallPct,
    classBreakdown,
  };
}
