import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock,
  Lock,
  TrendingUp,
} from 'lucide-react';
import { getRemainingEditMs, isSessionLocked } from '../services/api';
import type {
  AcademicYear,
  AttendanceSession,
  CourseClass,
  SubjectItem,
  User,
} from '../types/attendance';

interface LecturerDashboardProps {
  user: User;
  classes: CourseClass[];
  subjects: SubjectItem[];
  sessions: AttendanceSession[];
  confidenceThreshold: number;
  editWindowMinutes: number;
  onStartCapture: (classId?: string) => void;
  onOpenReview: (sessionId: string) => void;
}

function formatDurationShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s left`;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({
  user,
  classes,
  subjects,
  sessions,
  confidenceThreshold,
  editWindowMinutes,
  onStartCapture,
  onOpenReview,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [yearFilter, setYearFilter] = useState<'all' | AcademicYear>('all');

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredClasses = classes.filter((c) =>
    yearFilter === 'all' ? true : c.academicYear === yearFilter
  );

  const lecturerSessions = sessions.filter(
    (s) =>
      s.lecturerId === user.id &&
      (yearFilter === 'all' ? true : s.academicYear === yearFilter)
  );

  const totalEnrolled = filteredClasses.reduce((sum, c) => sum + c.enrolledCount, 0);

  const avgAttendanceRate =
    lecturerSessions.length > 0
      ? (
          lecturerSessions.reduce(
            (sum, s) => sum + (s.presentCount / Math.max(1, s.enrolledCount)) * 100,
            0
          ) / lecturerSessions.length
        ).toFixed(1)
      : '0.0';

  const activeEditableCount = lecturerSessions.filter((s) => !isSessionLocked(s, nowMs)).length;
  const flaggedSessionsCount = lecturerSessions.filter(
    (s) =>
      s.averageConfidence < confidenceThreshold ||
      s.warnings.lowConfidence ||
      s.warnings.unknownFacesCount > 0 ||
      s.warnings.duplicateMatches.length > 0 ||
      s.warnings.headcountMismatch !== null
  ).length;

  const classSummaries = filteredClasses.map((course) => {
    const courseSessions = lecturerSessions.filter((s) => s.classId === course.id);
    const courseSubjects = subjects.filter(
      (sub) => sub.classId === course.id && sub.lecturerId === user.id
    );
    const latest = courseSessions[0];
    const rate =
      courseSessions.length > 0
        ? Math.round(
            courseSessions.reduce(
              (acc, s) => acc + (s.presentCount / Math.max(1, s.enrolledCount)) * 100,
              0
            ) / courseSessions.length
          )
        : 0;
    return {
      course,
      courseSubjects,
      sessionCount: courseSessions.length,
      rate,
      latest,
    };
  });

  return (
    <div className="space-y-6">
      {/* 1st PUC / 2nd PUC Academic Year Selector */}
      <section className="uni-card p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[14px] font-semibold text-[#292929]">
            PUC Academic Year Filter
          </div>
          <div className="text-[12px] text-[#5C5552]">
            Switch between 1st PUC and 2nd PUC lecture batches or inspect combined totals
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg">
          {(['all', '1st PUC', '2nd PUC'] as const).map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setYearFilter(yr)}
              className={`px-3.5 py-1.5 text-[14px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                yearFilter === yr
                  ? 'bg-[#681C2D] text-white shadow-xs'
                  : 'text-[#5C5552] hover:bg-[#481321]/10 hover:text-[#481321]'
              }`}
            >
              {yr === 'all' ? 'All PUC Years' : yr}
            </button>
          ))}
        </div>
      </section>

      {/* KPI Metrics Row */}
      <section aria-label="Lecturer summary metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="uni-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-[#5C5552]">Assigned Classes</span>
              <span className="w-8 h-8 rounded-lg bg-[#FAF7F0] border border-[#D6A84B]/50 flex items-center justify-center text-[#681C2D]">
                <BookOpen className="w-4 h-4 text-[#D6A84B]" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-display text-3xl font-bold text-[#292929] tabular-nums">
                {filteredClasses.length}
              </span>
              <span className="text-[12px] font-normal text-[#5C5552] tabular-nums">
                {totalEnrolled} students enrolled
              </span>
            </div>
          </div>

          <div className="uni-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-[#5C5552]">Average Attendance</span>
              <span className="w-8 h-8 rounded-lg bg-[#FAF7F0] border border-[#D6A84B]/50 flex items-center justify-center text-[#681C2D]">
                <TrendingUp className="w-4 h-4 text-[#D6A84B]" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-display text-3xl font-bold text-[#292929] tabular-nums">
                {avgAttendanceRate}%
              </span>
              <span className="text-[12px] font-normal text-[#5C5552] tabular-nums">
                Across {lecturerSessions.length} sessions
              </span>
            </div>
          </div>

          <div className="uni-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-[#5C5552]">
                Active {editWindowMinutes}-Min Windows
              </span>
              <span className="w-8 h-8 rounded-lg bg-[#FAF7F0] border border-[#D6A84B]/50 flex items-center justify-center text-[#681C2D]">
                <Clock className="w-4 h-4 text-[#D6A84B]" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-display text-3xl font-bold text-[#681C2D] tabular-nums">
                {activeEditableCount}
              </span>
              <span className="text-[12px] font-normal text-[#5C5552]">Editable before lock</span>
            </div>
          </div>

          <div className="uni-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-[#5C5552]">Sessions with Alerts</span>
              <span
                className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                  flaggedSessionsCount > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span
                className={`font-display text-3xl font-bold tabular-nums ${
                  flaggedSessionsCount > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {flaggedSessionsCount}
              </span>
              <span className="text-[12px] font-normal text-[#5C5552]">Confidence or mismatch</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Split: Attendance Summary + Quick Capture Launch */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Attendance Summary */}
        <div className="lg:col-span-2 uni-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E7DFCE]">
            <div>
              <h2 className="font-display text-[22px] font-semibold text-[#292929]">
                PUC Class Attendance Summary
              </h2>
              <p className="text-[12px] font-normal text-[#5C5552] mt-0.5">
                Recorded presence across your assigned 1st PUC and 2nd PUC sections
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartCapture(filteredClasses[0]?.id)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#FAF7F0] hover:bg-[#D6A84B]/20 text-[#681C2D] border border-[#D6A84B]/60 rounded-lg text-[14px] font-semibold transition-colors whitespace-nowrap"
            >
              <Camera className="w-4 h-4 text-[#681C2D]" />
              <span>New Classroom Capture</span>
            </button>
          </div>

          <div className="mt-5 space-y-5">
            {classSummaries.map(({ course, courseSubjects, sessionCount, rate, latest }) => (
              <div
                key={course.id}
                className="pb-5 last:pb-0 border-b last:border-b-0 border-[#F0EAE0]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#FAF7F0] text-[#681C2D] border border-[#D6A84B]/60 rounded">
                        {course.academicYear}
                      </span>
                      <span className="text-[16px] font-medium text-[#292929]">
                        {course.code} · {course.name}
                      </span>
                    </div>
                    <div className="text-[12px] font-normal text-[#5C5552] mt-1">
                      {course.section} · {course.room} · {course.schedule}
                      {courseSubjects.length > 0 &&
                        ` · Subjects: ${courseSubjects.map((s) => s.name).join(', ')}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-mono text-[14px] font-semibold text-[#292929] tabular-nums">
                        {sessionCount > 0 ? `${rate}%` : '—'}
                      </div>
                      <div className="text-[12px] font-normal text-[#5C5552] tabular-nums">
                        {latest
                          ? `${latest.presentCount}/${latest.enrolledCount} present`
                          : `${course.enrolledCount} enrolled`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartCapture(course.id)}
                      className="px-3 py-1.5 text-[14px] font-semibold text-[#681C2D] bg-white hover:bg-[#FAF7F0] border border-[#D6CFC2] hover:border-[#D6A84B] rounded-lg transition-colors whitespace-nowrap"
                    >
                      Capture
                    </button>
                  </div>
                </div>

                <div className="mt-3 h-2 w-full bg-[#FAF7F0] border border-[#E7DFCE]/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#681C2D] to-[#D6A84B] rounded-full transition-all duration-300"
                    style={{ width: `${sessionCount > 0 ? rate : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Launch University Action Panel */}
        <div className="bg-gradient-to-br from-[#681C2D] via-[#481321] to-[#681C2D] text-white rounded-xl p-6 flex flex-col justify-between shadow-[0_4px_14px_rgba(72,19,33,0.18)] border border-[#D6A84B]/30">
          <div>
            <div className="text-[16px] font-medium text-[#D6A84B]">
              Classroom Lecture Capture
            </div>
            <h3 className="font-display text-[18px] font-semibold text-white mt-2 [text-wrap:balance]">
              Record automated attendance for today’s PUC lecture
            </h3>
            <p className="text-[14px] font-normal text-[#FAF7F0]/85 mt-3 leading-relaxed">
              Choose 1st or 2nd PUC, pick your class, subject, and topic, capture or upload the classroom photo, and review flagged rows before record lock.
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-white/15 space-y-3">
            <div className="text-[12px] font-normal text-[#FAF7F0]/85 space-y-1.5">
              <div>• Row-wise photo assist for rear-bench clarity</div>
              <div>• Automatic &lt;{confidenceThreshold}% confidence &amp; mismatch alerts</div>
              <div>• Finalized &amp; audited lock after {editWindowMinutes} minutes</div>
            </div>
            <button
              type="button"
              onClick={() => onStartCapture(filteredClasses[0]?.id)}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#D6A84B] hover:bg-[#C39538] text-[#292929] font-semibold text-[14px] rounded-lg transition-colors shadow-xs min-h-[44px]"
            >
              <Camera className="w-4 h-4 text-[#481321]" />
              <span>Open Attendance Capture</span>
              <ArrowRight className="w-4 h-4 text-[#481321]" />
            </button>
          </div>
        </div>
      </section>

      {/* Recent Sessions Table */}
      <section className="uni-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E7DFCE] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[22px] font-semibold text-[#292929]">
              Recent Lecture Sessions
            </h2>
            <p className="text-[12px] font-normal text-[#5C5552] mt-0.5">
              Select a session to review student records or inspect locked attendance
            </p>
          </div>
          <span className="text-[12px] font-normal text-[#5C5552] tabular-nums">
            Showing {lecturerSessions.length} sessions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E7DFCE] bg-[#FAF7F0] text-[14px] font-semibold text-[#292929]">
                <th className="py-3 px-6">Class, Subject &amp; Topic</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4 text-right">Present / Enrolled</th>
                <th className="py-3 px-4 text-right">Confidence</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE0] text-[14px] font-normal">
              {lecturerSessions.map((session) => {
                const locked = isSessionLocked(session, nowMs);
                const remaining = getRemainingEditMs(session, nowMs);
                const hasWarning =
                  session.averageConfidence < confidenceThreshold ||
                  session.warnings.lowConfidence ||
                  session.warnings.unknownFacesCount > 0 ||
                  session.warnings.duplicateMatches.length > 0 ||
                  session.warnings.headcountMismatch !== null;

                return (
                  <tr key={session.id} className="hover:bg-[#FAF7F0]/75 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-[#FAF7F0] text-[#681C2D] border border-[#D6A84B]/60 rounded">
                          {session.academicYear}
                        </span>
                        <span className="text-[14px] font-medium text-[#292929]">
                          {session.classCode} · {session.subjectName}
                        </span>
                      </div>
                      <div className="text-[12px] font-normal text-[#5C5552] mt-0.5">
                        {session.topicName || session.className} · {session.section} · {session.room}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5C5552] tabular-nums whitespace-nowrap">
                      <div className="text-[14px] font-normal text-[#292929]">{session.date}</div>
                      <div className="text-[12px] font-normal text-[#5C5552]">
                        {session.startTime}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[14px] font-normal text-[#292929] tabular-nums whitespace-nowrap">
                      {session.presentCount} / {session.enrolledCount}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span
                        className={`font-mono text-[14px] font-normal tabular-nums ${
                          session.averageConfidence < confidenceThreshold
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {session.averageConfidence.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5 text-[14px] font-normal">
                        {locked ? (
                          <span className="inline-flex items-center gap-1.5 text-[#5C5552]">
                            <Lock className="w-3.5 h-3.5 text-[#5C5552]" />
                            <span>Locked (Window Closed)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[#681C2D] font-medium tabular-nums">
                            <Clock className="w-3.5 h-3.5 text-[#D6A84B]" />
                            <span>Editable · {formatDurationShort(remaining)}</span>
                          </span>
                        )}
                        {hasWarning ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-normal text-amber-700">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Review warnings present</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-normal text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Nominal verification</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenReview(session.id)}
                        className="px-3.5 py-1.5 text-[14px] font-semibold text-[#681C2D] bg-white hover:bg-[#FAF7F0] border border-[#D6CFC2] hover:border-[#D6A84B] rounded-lg transition-colors"
                      >
                        {locked ? 'View Record' : 'Review & Edit'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
