export type UserRole = 'lecturer' | 'admin';

export type AcademicYear = '1st PUC' | '2nd PUC';

export type StreamType = 'Science (PCMC)' | 'Science (PCMB)' | 'Commerce (CEBA)';

export type EnrollmentStatus = 'Enrolled' | 'Pending Photo' | 'Inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  title: string;
}

export interface LecturerProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  assignedYears: AcademicYear[];
  subjectsTaught: string[];
  status: 'Active' | 'On Leave';
}

export interface SubjectItem {
  id: string;
  code: string;
  name: string;
  academicYear: AcademicYear;
  stream: StreamType;
  classId: string;
  lecturerId: string;
  lecturerName: string;
  weeklyHours: number;
}

export interface CourseClass {
  id: string;
  academicYear: AcademicYear;
  stream: StreamType;
  code: string;
  name: string;
  section: string;
  department: string;
  room: string;
  schedule: string;
  enrolledCount: number;
  lecturerId: string;
  lecturerName: string;
  /** true when this class comes from the FastAPI + PostgreSQL backend (real face recognition) */
  isLive?: boolean;
}

export interface EnrolledStudent {
  id: string;
  academicYear: AcademicYear;
  classId: string;
  rollNumber: string;
  name: string;
  program: string;
  section: string;
  defaultRow: string;
  enrollmentStatus: EnrollmentStatus;
}

export interface StudentAttendanceRecord {
  id: string;
  rollNumber: string;
  name: string;
  status: 'present' | 'absent';
  confidence: number | null;
  rowLabel?: string;
  matchWarning?: 'low_confidence' | 'duplicate_match' | null;
  manuallyEdited?: boolean;
  editNote?: string;
}

export interface UnknownFaceDetection {
  id: string;
  rowLabel: string;
  confidence: number;
  regionLabel: string;
  resolutionStatus: 'unresolved' | 'assigned' | 'dismissed';
  assignedStudentId?: string;
  assignedStudentName?: string;
}

export interface SessionWarnings {
  lowConfidence: boolean;
  unknownFacesCount: number;
  duplicateMatches: string[];
  headcountMismatch: {
    expectedPresent: number;
    detectedFaces: number;
    enrolledTotal: number;
  } | null;
}

export interface RowUploadLog {
  rowNumber: number;
  rowLabel: string;
  fileName: string;
  uploadedAt: string;
  averageConfidence: number;
  facesImproved: number;
}

export interface AttendanceSession {
  id: string;
  academicYear: AcademicYear;
  classId: string;
  classCode: string;
  className: string;
  subjectCode: string;
  subjectName: string;
  topicName?: string;
  section: string;
  room: string;
  date: string;
  startTime: string;
  capturedAt: string; // ISO timestamp
  lockDeadline: string; // ISO timestamp (+editWindowMinutes from capturedAt)
  forceLocked?: boolean;
  lecturerId: string;
  lecturerName: string;
  enrolledCount: number;
  presentCount: number;
  absentCount: number;
  unknownCount: number;
  detectedFaceCount: number;
  averageConfidence: number;
  hasRowUploads: boolean;
  rowUploads: RowUploadLog[];
  warnings: SessionWarnings;
  students: StudentAttendanceRecord[];
  unknownFaces: UnknownFaceDetection[];
  /** true when the result came from the real backend (saved in PostgreSQL) */
  isLive?: boolean;
}

export interface AuditLogEntry {
  id: string;
  academicYear: AcademicYear;
  sessionId: string;
  classCode: string;
  className: string;
  subjectName: string;
  sessionDate: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  previousStatus: 'present' | 'absent';
  newStatus: 'present' | 'absent';
  changedById: string;
  changedByName: string;
  changedByRole: UserRole;
  changedAt: string; // ISO timestamp
  reason: string;
}

export type DetectionScenario =
  | 'high_confidence'
  | 'low_confidence_unknown'
  | 'duplicate_headcount_mismatch';

export interface AnalyzePhotoPayload {
  academicYear: AcademicYear;
  classId: string;
  subjectId: string;
  topicName: string;
  sessionDate: string;
  sessionTime: string;
  photoFileName: string;
  scenario: DetectionScenario;
  expectedHeadcountOverride?: number;
  /** preview URL of the photo (blob:, data: or same-origin path); sent to the backend in live mode */
  photoUrl?: string;
}

export interface RowUploadPayload {
  sessionId: string;
  rowNumber: number;
  rowLabel: string;
  photoFileName: string;
  /** preview URL of the row photo; sent to the backend in live mode */
  photoUrl?: string;
}
