import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileClock,
  Layers,
  Lock,
  TrendingUp,
} from 'lucide-react';
import { buildPucAttendanceReport, isSessionLocked } from '../services/api';
import type {
  AcademicYear,
  AttendanceSession,
  AuditLogEntry,
  CourseClass,
  EnrolledStudent,
} from '../types/attendance';

interface AdminDashboardProps {
  classes: CourseClass[];
  students: EnrolledStudent[];
  sessions: AttendanceSession[];
  auditLogs: AuditLogEntry[];
  confidenceThreshold: number;
  onInspectSession: (sessionId: string) => void;
  onOpenAuditLog: () => void;
  onOpenPucYear: (year: AcademicYear) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  classes,
  students,
  sessions,
  auditLogs,
  confidenceThreshold,
  onInspectSession,
  onOpenAuditLog,
  onOpenPucYear,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [filterMode, setFilterMode] = useState<'all' | 'flagged' | 'locked'>('all');
  const [yearFilter, setYearFilter] = useState<'all' | AcademicYear>('all');

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const puc1Report = buildPucAttendanceReport('1st PUC', classes, sessions, students);
  const puc2Report = buildPucAttendanceReport('2nd PUC', classes, sessions, students);

  const avgAttendance =
    sessions.length > 0
      ? (
          sessions.reduce(
            (sum, s) => sum + (s.presentCount / Math.max(1, s.enrolledCount)) * 100,
            0
          ) / sessions.length
        ).toFixed(1)
      : '0.0';

  const yearScopedSessions = sessions.filter((s) =>
    yearFilter === 'all' ? true : s.academicYear === yearFilter
  );

  const flaggedSessions = yearScopedSessions.filter(
    (s) =>
      s.averageConfidence < confidenceThreshold ||
      s.warnings.lowConfidence ||
      s.warnings.unknownFacesCount > 0 ||
      s.warnings.duplicateMatches.length > 0 ||
      s.warnings.headcountMismatch !== null
  );

  const displayedSessions = yearScopedSessions.filter((s) => {
    if (filterMode === 'flagged') {
      return (
        s.averageConfidence < confidenceThreshold ||
        s.warnings.lowConfidence ||
        s.warnings.unknownFacesCount > 0 ||
        s.warnings.duplicateMatches.length > 0 ||
        s.warnings.headcountMismatch !== null
      );
    }
    if (filterMode === 'locked') {
      return isSessionLocked(s, nowMs);
    }
    return true;
  });

  return (
    <div className="space-y-7">
      {/* Institution KPI Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="uni-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#5C5552]">PUC Classes &amp; Students</span>
            <span className="w-8 h-8 rounded-lg bg-[#FAF7F0] border border-[#D6A84B]/50 flex items-center justify-center text-[#681C2D]">
              <BookOpen className="w-4 h-4 text-[#D6A84B]" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold text-[#292929] tabular-nums">
              {classes.length}
            </span>
            <span className="text-[12px] font-normal text-[#5C5552] tabular-nums">
              {students.length} students enrolled
            </span>
          </div>
        </div>

        <div className="uni-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#5C5552]">Mean Attendance Rate</span>
            <span className="w-8 h-8 rounded-lg bg-[#FAF7F0] border border-[#D6A84B]/50 flex items-center justify-center text-[#681C2D]">
              <TrendingUp className="w-4 h-4 text-[#D6A84B]" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold text-[#292929] tabular-nums">
              {avgAttendance}%
            </span>
            <span className="text-[12px] font-normal text-[#5C5552] tabular-nums">
              {sessions.length} recorded sessions
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAuditLog}
          className="uni-card p-5 text-left hover:border-[#D6A84B] transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#5C5552]">Manual Overrides</span>
            <span className="w-8 h-8 rounded-lg bg-[#FAF7F0] border border-[#D6A84B]/50 flex items-center justify-center text-[#681C2D]">
              <FileClock className="w-4 h-4 text-[#D6A84B]" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold text-[#681C2D] tabular-nums">
              {auditLogs.length}
            </span>
            <span className="text-[12px] font-medium text-[#681C2D] underline decoration-[#D6A84B]">
              View audit logs
            </span>
          </div>
        </button>
      </section>

      {/* Separate 1st PUC and 2nd PUC Summary Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[puc1Report, puc2Report].map((rep) => (
          <div key={rep.academicYear} className="uni-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E7DFCE]">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-[#681C2D] text-white flex items-center justify-center border border-[#D6A84B]/40">
                  <Layers className="w-4 h-4 text-[#D6A84B]" />
                </span>
                <div>
                  <h2 className="font-display text-[22px] font-semibold text-[#292929]">
                    {rep.academicYear} Overview
                  </h2>
                  <p className="text-[12px] text-[#5C5552] tabular-nums">
                    {rep.totalClasses} classes · {rep.totalStudents} students ({rep.pendingPhotos}{' '}
                    pending photo)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenPucYear(rep.academicYear)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg transition-colors shadow-2xs"
              >
                <span>Open {rep.academicYear}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg">
                <div className="text-[12px] text-[#5C5552]">Attendance</div>
                <div className="font-mono text-xl font-bold text-[#681C2D] mt-0.5 tabular-nums">
                  {rep.overallPct}%
                </div>
              </div>
              <div className="p-3 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg">
                <div className="text-[12px] text-[#5C5552]">Sessions</div>
                <div className="font-mono text-xl font-bold text-[#292929] mt-0.5 tabular-nums">
                  {rep.totalSessions}
                </div>
              </div>
              <div className="p-3 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg">
                <div className="text-[12px] text-[#5C5552]">Enrolled</div>
                <div className="font-mono text-xl font-bold text-emerald-700 mt-0.5 tabular-nums">
                  {rep.enrolledActive}/{rep.totalStudents}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Institutional Sessions Monitor */}
      <section className="uni-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E7DFCE] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-[22px] font-semibold text-[#292929]">
              All Classroom Attendance Sessions
            </h2>
            <p className="text-[12px] font-normal text-[#5C5552] mt-0.5">
              College-wide visibility across 1st PUC &amp; 2nd PUC lecturers, lock status, and alerts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg">
              {(['all', '1st PUC', '2nd PUC'] as const).map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setYearFilter(yr)}
                  className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                    yearFilter === yr
                      ? 'bg-[#D6A84B] text-[#292929] shadow-xs'
                      : 'text-[#5C5552] hover:bg-[#481321]/10 hover:text-[#481321]'
                  }`}
                >
                  {yr === 'all' ? 'All Years' : yr}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg">
              {(
                [
                  { id: 'all', label: `All (${yearScopedSessions.length})` },
                  { id: 'flagged', label: `Flagged (${flaggedSessions.length})` },
                  { id: 'locked', label: 'Locked' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-3 py-1.5 text-[14px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                    filterMode === tab.id
                      ? 'bg-[#681C2D] text-white shadow-xs'
                      : 'text-[#5C5552] hover:bg-[#481321]/10 hover:text-[#481321]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E7DFCE] bg-[#FAF7F0] text-[14px] font-semibold text-[#292929]">
                <th className="py-3 px-6">Year, Class &amp; Subject</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4 text-right">Present / Enrolled</th>
                <th className="py-3 px-4 text-right">Confidence</th>
                <th className="py-3 px-4">Compliance &amp; Lock</th>
                <th className="py-3 px-6 text-right">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE0] text-[14px] font-normal">
              {displayedSessions.map((ses) => {
                const locked = isSessionLocked(ses, nowMs);
                const hasAlerts =
                  ses.averageConfidence < confidenceThreshold ||
                  ses.warnings.lowConfidence ||
                  ses.warnings.unknownFacesCount > 0 ||
                  ses.warnings.duplicateMatches.length > 0 ||
                  ses.warnings.headcountMismatch !== null;

                return (
                  <tr key={ses.id} className="hover:bg-[#FAF7F0]/75 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-[#FAF7F0] text-[#681C2D] border border-[#D6A84B]/60 rounded">
                          {ses.academicYear}
                        </span>
                        <span className="text-[14px] font-medium text-[#292929]">
                          {ses.classCode} · {ses.subjectName}
                        </span>
                      </div>
                      <div className="text-[12px] font-normal text-[#5C5552] mt-0.5">
                        {ses.topicName ? `Topic: ${ses.topicName} · ` : ''}
                        {ses.lecturerName} · {ses.section} · {ses.room}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5C5552] tabular-nums whitespace-nowrap">
                      <div className="text-[14px] font-normal text-[#292929]">{ses.date}</div>
                      <div className="text-[12px] font-normal text-[#5C5552]">{ses.startTime}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[14px] font-normal text-[#292929] tabular-nums whitespace-nowrap">
                      {ses.presentCount} / {ses.enrolledCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[14px] font-normal tabular-nums whitespace-nowrap">
                      <span
                        className={
                          ses.averageConfidence < confidenceThreshold
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }
                      >
                        {ses.averageConfidence.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5 text-[14px] font-normal">
                        {locked ? (
                          <span className="inline-flex items-center gap-1.5 text-[#5C5552]">
                            <Lock className="w-3.5 h-3.5 text-[#5C5552]" />
                            <span>Locked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[#681C2D] font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#D6A84B]" />
                            <span>Edit Window Open</span>
                          </span>
                        )}
                        {hasAlerts ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-normal text-amber-700">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Warnings flagged</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[12px] font-normal text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified clean</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onInspectSession(ses.id)}
                        className="px-3.5 py-1.5 text-[14px] font-semibold text-[#681C2D] bg-white hover:bg-[#FAF7F0] border border-[#D6CFC2] hover:border-[#D6A84B] rounded-lg transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Audit Activity Preview */}
      <section className="uni-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E7DFCE]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-[#FAF7F0] border border-[#D6A84B]/50 flex items-center justify-center text-[#681C2D]">
              <FileClock className="w-4 h-4 text-[#D6A84B]" />
            </span>
            <div>
              <h2 className="font-display text-[22px] font-semibold text-[#292929]">
                Recent Attendance Audit Activity
              </h2>
              <p className="text-[12px] font-normal text-[#5C5552]">
                Latest manual attendance modifications across 1st PUC &amp; 2nd PUC streams
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAuditLog}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-semibold text-[#681C2D] bg-[#FAF7F0] hover:bg-[#D6A84B]/20 border border-[#D6A84B]/60 rounded-lg transition-colors whitespace-nowrap"
          >
            <span>Open Full Audit Log</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 divide-y divide-[#F0EAE0]">
          {auditLogs.slice(0, 4).map((entry) => (
            <div
              key={entry.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[14px] font-normal"
            >
              <div>
                <span className="font-medium text-[#292929]">{entry.changedByName}</span>{' '}
                <span className="text-[12px] font-normal text-[#5C5552]">
                  ({entry.changedByRole === 'admin' ? 'Admin' : 'Lecturer'})
                </span>{' '}
                <span className="text-[#5C5552]">updated</span>{' '}
                <span className="font-medium text-[#292929]">
                  {entry.studentName} ({entry.rollNumber})
                </span>{' '}
                <span className="text-[#5C5552]">
                  in {entry.academicYear} · {entry.classCode} ({entry.subjectName})
                </span>
              </div>
              <div className="flex items-center gap-4 text-[12px] font-normal shrink-0 tabular-nums">
                <span className="font-mono">
                  <span className={entry.previousStatus === 'present' ? 'text-emerald-700' : 'text-red-700'}>
                    {entry.previousStatus}
                  </span>
                  {' → '}
                  <span className={entry.newStatus === 'present' ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                    {entry.newStatus}
                  </span>
                </span>
                <span className="text-[#5C5552]">
                  {new Date(entry.changedAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
