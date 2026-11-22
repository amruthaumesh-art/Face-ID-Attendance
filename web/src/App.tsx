import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { AttendanceReview } from './components/AttendanceReview';
import { AuditLogView } from './components/AuditLogView';
import { CaptureAttendance } from './components/CaptureAttendance';
import { ClassesDirectory } from './components/ClassesDirectory';
import { FacultyClassesManager } from './components/FacultyClassesManager';
import { type ActivePage, Layout } from './components/Layout';
import { LecturerDashboard } from './components/LecturerDashboard';
import { LoginPage } from './components/LoginPage';
import { PucRecordsView } from './components/PucRecordsView';
import { fetchInitialData } from './services/api';
import {
  LIVE_BACKEND,
  correctLiveAttendance,
  enrollLiveFace,
  makeLiveClass,
  makeLiveSubject,
  registerLiveStudent,
} from './services/liveApi';
import type {
  AcademicYear,
  AttendanceSession,
  AuditLogEntry,
  CourseClass,
  EnrolledStudent,
  LecturerProfile,
  SubjectItem,
  User,
} from './types/attendance';

const CONFIDENCE_THRESHOLD = 95;
const EDIT_WINDOW_MINUTES = 60;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>('lecturer_dashboard');

  const [allClasses, setAllClasses] = useState<CourseClass[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [lecturers, setLecturers] = useState<LecturerProfile[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [selectedClassForCapture, setSelectedClassForCapture] = useState<string | undefined>(
    undefined
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string>('ses-1001');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load initial sample dataset when user signs in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setIsLoadingData(true);

    fetchInitialData()
      .then((initialData) => {
        if (cancelled) return;
        setAllClasses((prev) => (prev.length > 0 ? prev : initialData.allClasses));
        setSubjects((prev) => (prev.length > 0 ? prev : initialData.subjects));
        setStudents((prev) => (prev.length > 0 ? prev : initialData.students));
        setLecturers((prev) => (prev.length > 0 ? prev : initialData.lecturers));
        setSessions((prev) => (prev.length > 0 ? prev : initialData.sessions));
        setAuditLogs((prev) => (prev.length > 0 ? prev : initialData.auditLogs));

        const roleClasses =
          user.role === 'admin'
            ? initialData.allClasses
            : initialData.allClasses.filter((c) => c.lecturerId === user.id);

        if (roleClasses.length > 0) {
          setSelectedClassForCapture(roleClasses[0].id);
        }

        const defaultSes =
          user.role === 'admin'
            ? initialData.sessions[0]
            : initialData.sessions.find((s) => s.lecturerId === user.id) ||
              initialData.sessions[0];
        if (defaultSes) {
          setSelectedSessionId(defaultSes.id);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const roleClasses =
    user?.role === 'admin'
      ? allClasses
      : allClasses.filter((c) => c.lecturerId === user?.id);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setActivePage(
      loggedInUser.role === 'admin' ? 'admin_dashboard' : 'lecturer_dashboard'
    );
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleStartCapture = (classId?: string) => {
    if (classId) {
      setSelectedClassForCapture(classId);
    }
    setActivePage('capture_attendance');
  };

  const handleOpenReview = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setActivePage('attendance_review');
  };

  const handleSessionCreated = (newSession: AttendanceSession) => {
    setSessions((prev) => [newSession, ...prev]);
    setSelectedSessionId(newSession.id);
  };

  const handleSessionUpdated = (updatedSession: AttendanceSession) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
  };

  const handleUpdateStudentStatus = (
    sessionId: string,
    studentId: string,
    newStatus: 'present' | 'absent',
    reason: string
  ) => {
    if (!user) return;
    const targetSession = sessions.find((s) => s.id === sessionId);
    const targetStudent = targetSession?.students.find((st) => st.id === studentId);
    if (!targetSession || !targetStudent || targetStudent.status === newStatus) {
      return;
    }

    if (targetSession.isLive) {
      // Save to PostgreSQL first (1-hour window + audit log enforced by the backend).
      correctLiveAttendance(targetSession, studentId, newStatus, user.name, reason)
        .then(() => applyStatusChange(targetSession, targetStudent, newStatus, reason))
        .catch((err) =>
          window.alert(
            `Correction not saved: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      return;
    }
    applyStatusChange(targetSession, targetStudent, newStatus, reason);
  };

  const applyStatusChange = (
    targetSession: AttendanceSession,
    targetStudent: AttendanceSession['students'][number],
    newStatus: 'present' | 'absent',
    reason: string
  ) => {
    if (!user) return;
    const sessionId = targetSession.id;
    const studentId = targetStudent.id;
    const previousStatus = targetStudent.status;

    setSessions((prev) =>
      prev.map((ses) => {
        if (ses.id !== sessionId) return ses;
        const updatedStudents = ses.students.map((st) =>
          st.id === studentId
            ? {
                ...st,
                status: newStatus,
                manuallyEdited: true,
                editNote: reason,
              }
            : st
        );
        return {
          ...ses,
          students: updatedStudents,
          presentCount: updatedStudents.filter((st) => st.status === 'present').length,
          absentCount: updatedStudents.filter((st) => st.status === 'absent').length,
        };
      })
    );

    const newAuditEntry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      academicYear: targetSession.academicYear,
      sessionId: targetSession.id,
      classCode: targetSession.classCode,
      className: targetSession.className,
      subjectName: targetSession.subjectName,
      sessionDate: targetSession.date,
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      rollNumber: targetStudent.rollNumber,
      previousStatus,
      newStatus,
      changedById: user.id,
      changedByName: user.name,
      changedByRole: user.role,
      changedAt: new Date().toISOString(),
      reason,
    };

    setAuditLogs((prev) => [newAuditEntry, ...prev]);
  };

  const handleSimulateLock = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((ses) =>
        ses.id === sessionId ? { ...ses, forceLocked: true } : ses
      )
    );
  };

  // Student CRUD for 1st PUC / 2nd PUC Admin Management
  const handleAddStudent = (newStudentData: Omit<EnrolledStudent, 'id'>) => {
    const targetClass = allClasses.find((c) => c.id === newStudentData.classId);
    if (targetClass?.isLive) {
      // Live class: the roll number becomes the student ID in PostgreSQL.
      const studentId = newStudentData.rollNumber;
      registerLiveStudent(studentId, newStudentData.name, targetClass.id)
        .then(() => addStudentLocally({ ...newStudentData, enrollmentStatus: 'Pending Photo' }, studentId))
        .catch((err) =>
          window.alert(`Student not saved: ${err instanceof Error ? err.message : String(err)}`)
        );
      return;
    }
    addStudentLocally(newStudentData, `stu-${Date.now()}`);
  };

  const handleEnrollFace = async (student: EnrolledStudent, file: File): Promise<string> => {
    const message = await enrollLiveFace(student.id, file);
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, enrollmentStatus: 'Enrolled' } : s))
    );
    return message;
  };

  const addStudentLocally = (newStudentData: Omit<EnrolledStudent, 'id'>, id: string) => {
    const created: EnrolledStudent = {
      ...newStudentData,
      id,
    };
    setStudents((prev) => [created, ...prev]);
    setAllClasses((prev) =>
      prev.map((c) =>
        c.id === created.classId
          ? { ...c, enrolledCount: c.enrolledCount + 1 }
          : c
      )
    );
  };

  const handleUpdateStudent = (updated: EnrolledStudent) => {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteStudent = (studentId: string) => {
    const target = students.find((s) => s.id === studentId);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    if (target) {
      setAllClasses((prev) =>
        prev.map((c) =>
          c.id === target.classId
            ? { ...c, enrolledCount: Math.max(0, c.enrolledCount - 1) }
            : c
        )
      );
    }
  };

  // Lecturer, Class, Subject CRUD for Admin
  const handleAddLecturer = (data: Omit<LecturerProfile, 'id'>) => {
    setLecturers((prev) => [{ ...data, id: `usr-lec-${Date.now()}` }, ...prev]);
  };

  const handleToggleLecturerStatus = (lecturerId: string) => {
    setLecturers((prev) =>
      prev.map((l) =>
        l.id === lecturerId
          ? { ...l, status: l.status === 'Active' ? 'On Leave' : 'Active' }
          : l
      )
    );
  };

  const handleAddClass = (data: Omit<CourseClass, 'id'>) => {
    if (LIVE_BACKEND) {
      // In live mode new classes are real: the class code is the class name in PostgreSQL.
      const live = { ...makeLiveClass(data.code.trim()), ...data, id: data.code.trim(), isLive: true };
      setAllClasses((prev) => [live, ...prev.filter((c) => c.id !== live.id)]);
      setSubjects((prev) =>
        prev.some((s) => s.classId === live.id)
          ? prev
          : [{ ...makeLiveSubject(live.id), academicYear: live.academicYear, stream: live.stream }, ...prev]
      );
      return;
    }
    setAllClasses((prev) => [{ ...data, id: `cls-${Date.now()}` }, ...prev]);
  };

  const handleAddSubject = (data: Omit<SubjectItem, 'id'>) => {
    setSubjects((prev) => [{ ...data, id: `sub-${Date.now()}` }, ...prev]);
  };

  const handleUpdateSubject = (updated: SubjectItem) => {
    setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteSubject = (subjectId: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
  };

  const handleOpenPucYear = (year: AcademicYear) => {
    setActivePage(year === '1st PUC' ? 'admin_puc1' : 'admin_puc2');
  };

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const pageMeta: Record<ActivePage, { title: string; breadcrumb: string }> = {
    lecturer_dashboard: {
      title: 'Lecturer Dashboard',
      breadcrumb: 'FACE ID / 1st & 2nd PUC Faculty Workspace',
    },
    capture_attendance: {
      title: 'Capture & Analyze Classroom Attendance',
      breadcrumb: 'FACE ID / Attendance Capture',
    },
    attendance_review: {
      title: 'Attendance Review & Verification',
      breadcrumb: `FACE ID / ${EDIT_WINDOW_MINUTES}-Min Edit Window`,
    },
    lecturer_classes: {
      title: user.role === 'admin' ? 'PUC Course & Roster Directory' : 'Assigned PUC Classes',
      breadcrumb: 'FACE ID / Classes & Subjects',
    },
    admin_dashboard: {
      title: 'Administrator Dashboard',
      breadcrumb: 'FACE ID / 1st & 2nd PUC Governance',
    },
    admin_puc1: {
      title: '1st PUC Records, Students & Reports',
      breadcrumb: 'FACE ID / 1st PUC Management',
    },
    admin_puc2: {
      title: '2nd PUC Records, Students & Reports',
      breadcrumb: 'FACE ID / 2nd PUC Management',
    },
    admin_faculty_classes: {
      title: 'Lecturers, Classes & Subjects',
      breadcrumb: 'FACE ID / Academic Configuration',
    },
    admin_audit_log: {
      title: 'Attendance Modification Audit Logs',
      breadcrumb: 'FACE ID / Compliance & Audit',
    },
  };

  const currentMeta = pageMeta[activePage];

  const primaryAction =
    user.role === 'lecturer' && activePage !== 'capture_attendance'
      ? {
          label: 'Capture Attendance',
          onClick: () => handleStartCapture(),
        }
      : user.role === 'admin' && activePage !== 'admin_audit_log'
        ? {
            label: 'View Audit Logs',
            onClick: () => setActivePage('admin_audit_log'),
          }
        : undefined;

  return (
    <Layout
      user={user}
      activePage={activePage}
      onNavigate={setActivePage}
      onLogout={handleLogout}
      pageTitle={currentMeta.title}
      breadcrumb={currentMeta.breadcrumb}
      primaryAction={primaryAction}
    >
      {isLoadingData ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-28 bg-white border border-[#E7DFCE] rounded-xl animate-pulse"
              />
            ))}
          </div>
          <div className="h-64 bg-white border border-[#E7DFCE] rounded-xl animate-pulse" />
        </div>
      ) : (
        <>
          {activePage === 'lecturer_dashboard' && (
            <LecturerDashboard
              user={user}
              classes={roleClasses}
              subjects={subjects}
              sessions={sessions}
              confidenceThreshold={CONFIDENCE_THRESHOLD}
              editWindowMinutes={EDIT_WINDOW_MINUTES}
              onStartCapture={handleStartCapture}
              onOpenReview={handleOpenReview}
            />
          )}

          {activePage === 'capture_attendance' && (
            <CaptureAttendance
              user={user}
              classes={roleClasses}
              subjects={subjects}
              students={students}
              confidenceThreshold={CONFIDENCE_THRESHOLD}
              editWindowMinutes={EDIT_WINDOW_MINUTES}
              initialClassId={selectedClassForCapture}
              onSessionCreated={handleSessionCreated}
              onSessionUpdated={handleSessionUpdated}
              onProceedToReview={handleOpenReview}
            />
          )}

          {activePage === 'attendance_review' && (
            <AttendanceReview
              user={user}
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              confidenceThreshold={CONFIDENCE_THRESHOLD}
              editWindowMinutes={EDIT_WINDOW_MINUTES}
              onSelectSession={setSelectedSessionId}
              onUpdateStudentStatus={handleUpdateStudentStatus}
              onSimulateLock={handleSimulateLock}
            />
          )}

          {activePage === 'lecturer_classes' && (
            <ClassesDirectory
              role={user.role}
              classes={roleClasses}
              subjects={subjects}
              students={students}
              onStartCapture={
                user.role === 'lecturer' ? handleStartCapture : undefined
              }
            />
          )}

          {activePage === 'admin_dashboard' && (
            <AdminDashboard
              classes={allClasses}
              students={students}
              sessions={sessions}
              auditLogs={auditLogs}
              confidenceThreshold={CONFIDENCE_THRESHOLD}
              onInspectSession={handleOpenReview}
              onOpenAuditLog={() => setActivePage('admin_audit_log')}
              onOpenPucYear={handleOpenPucYear}
            />
          )}

          {activePage === 'admin_puc1' && (
            <PucRecordsView
              academicYear="1st PUC"
              classes={allClasses}
              students={students}
              sessions={sessions}
              confidenceThreshold={CONFIDENCE_THRESHOLD}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onEnrollFace={handleEnrollFace}
              onInspectSession={handleOpenReview}
            />
          )}

          {activePage === 'admin_puc2' && (
            <PucRecordsView
              academicYear="2nd PUC"
              classes={allClasses}
              students={students}
              sessions={sessions}
              confidenceThreshold={CONFIDENCE_THRESHOLD}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onEnrollFace={handleEnrollFace}
              onInspectSession={handleOpenReview}
            />
          )}

          {activePage === 'admin_faculty_classes' && (
            <FacultyClassesManager
              lecturers={lecturers}
              classes={allClasses}
              subjects={subjects}
              onAddLecturer={handleAddLecturer}
              onToggleLecturerStatus={handleToggleLecturerStatus}
              onAddClass={handleAddClass}
              onAddSubject={handleAddSubject}
              onUpdateSubject={handleUpdateSubject}
              onDeleteSubject={handleDeleteSubject}
            />
          )}

          {activePage === 'admin_audit_log' && (
            <AuditLogView auditLogs={auditLogs} />
          )}
        </>
      )}
    </Layout>
  );
}
