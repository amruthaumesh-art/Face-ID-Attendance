import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Download,
  Edit3,
  Lock,
  Search,
  X,
} from 'lucide-react';
import { getRemainingEditMs, isSessionLocked } from '../services/api';
import type {
  AcademicYear,
  AttendanceSession,
  StudentAttendanceRecord,
  User,
} from '../types/attendance';

interface AttendanceReviewProps {
  user: User;
  sessions: AttendanceSession[];
  selectedSessionId: string;
  confidenceThreshold: number;
  editWindowMinutes: number;
  onSelectSession: (sessionId: string) => void;
  onUpdateStudentStatus: (
    sessionId: string,
    studentId: string,
    newStatus: 'present' | 'absent',
    reason: string
  ) => void;
  onSimulateLock: (sessionId: string) => void;
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

export const AttendanceReview: React.FC<AttendanceReviewProps> = ({
  user,
  sessions,
  selectedSessionId,
  confidenceThreshold,
  editWindowMinutes,
  onSelectSession,
  onUpdateStudentStatus,
  onSimulateLock,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [yearFilter, setYearFilter] = useState<'all' | AcademicYear>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'flagged'>('all');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editTargetStatus, setEditTargetStatus] = useState<'present' | 'absent'>('present');
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleSessions = (
    user.role === 'admin'
      ? sessions
      : sessions.filter((s) => s.lecturerId === user.id)
  ).filter((s) => (yearFilter === 'all' ? true : s.academicYear === yearFilter));

  const activeSession =
    visibleSessions.find((s) => s.id === selectedSessionId) || visibleSessions[0];

  if (!activeSession) {
    return (
      <div className="space-y-4">
        <div className="uni-card p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[14px] font-medium text-[#292929]">Academic Year Filter</span>
          <div className="flex items-center gap-1 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg">
            {(['all', '1st PUC', '2nd PUC'] as const).map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setYearFilter(yr)}
                className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${
                  yearFilter === yr
                    ? 'bg-[#681C2D] text-white'
                    : 'text-[#5C5552] hover:bg-[#481321]/10 hover:text-[#481321]'
                }`}
              >
                {yr === 'all' ? 'All PUC Years' : yr}
              </button>
            ))}
          </div>
        </div>
        <div className="uni-card p-10 text-center text-[14px] font-normal text-[#5C5552]">
          No attendance sessions are available for {yearFilter === 'all' ? 'review' : yearFilter} yet.
        </div>
      </div>
    );
  }

  const locked = isSessionLocked(activeSession, nowMs);
  const remainingMs = getRemainingEditMs(activeSession, nowMs);
  const lockTimeFormatted = new Date(activeSession.lockDeadline).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const startEditing = (student: StudentAttendanceRecord) => {
    setEditingStudentId(student.id);
    setEditTargetStatus(student.status === 'present' ? 'absent' : 'present');
    setEditReason('');
  };

  const confirmEdit = (student: StudentAttendanceRecord) => {
    if (locked) return;
    const finalReason =
      editReason.trim() ||
      `Manual verification during ${editWindowMinutes}-minute review window.`;
    onUpdateStudentStatus(activeSession.id, student.id, editTargetStatus, finalReason);
    setEditingStudentId(null);
    setEditReason('');
  };

  const handleExportCsv = () => {
    const header = [
      'Academic Year',
      'Class Code',
      'Subject',
      'Topic',
      'Roll Number',
      'Student Name',
      'Row',
      'Status',
      'Confidence (%)',
      'Edited',
      'Note',
    ];
    const rows = activeSession.students.map((s) => [
      activeSession.academicYear,
      activeSession.classCode,
      `"${activeSession.subjectName}"`,
      `"${(activeSession.topicName || '').replace(/"/g, '""')}"`,
      s.rollNumber,
      `"${s.name}"`,
      `"${s.rowLabel || ''}"`,
      s.status,
      s.confidence !== null ? s.confidence.toFixed(1) : '',
      s.manuallyEdited ? 'Yes' : 'No',
      `"${(s.editNote || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeSession.classCode}_${activeSession.date}_attendance.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredStudents = activeSession.students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'present') return s.status === 'present';
    if (statusFilter === 'absent') return s.status === 'absent';
    if (statusFilter === 'flagged') {
      return Boolean(
        s.matchWarning ||
          (s.confidence !== null && s.confidence < confidenceThreshold) ||
          s.manuallyEdited
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Session Selector & 1-Hour Lock Window Status */}
      <section className="uni-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E7DFCE]">
          <div className="text-[12px] text-[#5C5552]">
            <span className="font-semibold text-[#681C2D]">{activeSession.academicYear}</span>
            {' · '}
            <span className="font-medium text-[#292929]">{activeSession.subjectName}</span>
            {activeSession.topicName ? ` · Topic: ${activeSession.topicName}` : ''}
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg">
            {(['all', '1st PUC', '2nd PUC'] as const).map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => {
                  setYearFilter(yr);
                  setEditingStudentId(null);
                }}
                className={`px-3 py-1 text-[12px] font-semibold rounded-md transition-colors ${
                  yearFilter === yr
                    ? 'bg-[#681C2D] text-white'
                    : 'text-[#5C5552] hover:bg-[#481321]/10 hover:text-[#481321]'
                }`}
              >
                {yr === 'all' ? 'All Years' : yr}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label
              htmlFor="review-session-select"
              className="block text-[14px] font-medium text-[#292929] mb-1.5"
            >
              Selected Attendance Session
            </label>
            <select
              id="review-session-select"
              value={activeSession.id}
              onChange={(e) => {
                onSelectSession(e.target.value);
                setEditingStudentId(null);
              }}
              className="uni-input w-full max-w-xl px-3.5 py-2.5 text-[14px] min-h-[44px]"
            >
              {visibleSessions.map((ses) => {
                const sesLocked = isSessionLocked(ses, nowMs);
                return (
                  <option key={ses.id} value={ses.id}>
                    {ses.academicYear} · {ses.classCode} ({ses.subjectName}
                    {ses.topicName ? ` — ${ses.topicName}` : ''}) · {ses.date} {ses.startTime} —{' '}
                    {sesLocked ? 'Locked' : 'Editable'}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {!locked && (
              <button
                type="button"
                onClick={() => onSimulateLock(activeSession.id)}
                className="px-3.5 py-2 text-[14px] font-semibold text-[#681C2D] bg-[#FAF7F0] hover:bg-[#481321]/10 border border-[#D6CFC2] rounded-lg transition-colors whitespace-nowrap min-h-[40px]"
              >
                Simulate Lock
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg transition-colors whitespace-nowrap min-h-[40px]"
            >
              <Download className="w-4 h-4 text-[#481321]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Window Status Banner */}
        {locked ? (
          <div className="p-4 bg-[#FAF7F0] border border-[#D6CFC2] rounded-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E7DFCE] text-[#481321] flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-[18px] font-semibold text-[#292929]">
                  Attendance Record Locked
                </h3>
                <p className="text-[12px] font-normal text-[#5C5552]">
                  The {editWindowMinutes}-minute edit window expired at {lockTimeFormatted}. Records are finalized and read-only.
                </p>
              </div>
            </div>
            <span className="text-[12px] font-mono font-semibold text-[#481321]">
              LOCKED · READ-ONLY
            </span>
          </div>
        ) : (
          <div className="p-4 bg-[#FAF7F0] border border-[#D6A84B]/60 rounded-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#681C2D] text-[#D6A84B] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-[18px] font-semibold text-[#292929]">
                  {editWindowMinutes}-Minute Verification &amp; Edit Window Active
                </h3>
                <p className="text-[12px] font-normal text-[#5C5552]">
                  Manual status changes saved before {lockTimeFormatted} are recorded in the institutional audit log.
                </p>
              </div>
            </div>
            <div className="font-mono text-[16px] font-semibold text-[#681C2D] tabular-nums">
              {formatCountdown(remainingMs)} remaining
            </div>
          </div>
        )}
      </section>

      {/* Summary Strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="uni-card p-4">
          <div className="text-[14px] font-medium text-[#5C5552]">Present</div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {activeSession.presentCount}
          </div>
        </div>
        <div className="uni-card p-4">
          <div className="text-[14px] font-medium text-[#5C5552]">Absent</div>
          <div className="mt-1 font-mono text-2xl font-bold text-red-700 tabular-nums">
            {activeSession.absentCount}
          </div>
        </div>
        <div className="uni-card p-4">
          <div className="text-[14px] font-medium text-[#5C5552]">Avg. Confidence</div>
          <div
            className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
              activeSession.averageConfidence < confidenceThreshold
                ? 'text-amber-700'
                : 'text-[#292929]'
            }`}
          >
            {activeSession.averageConfidence.toFixed(1)}%
          </div>
        </div>
        <div className="uni-card p-4">
          <div className="text-[14px] font-medium text-[#5C5552]">Detected / Enrolled</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#292929] tabular-nums">
            {activeSession.detectedFaceCount} / {activeSession.enrolledCount}
          </div>
        </div>
      </section>

      {/* Filter Toolbar & Roster Table */}
      <section className="uni-card overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-[#E7DFCE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#8C7F78] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name or roll number..."
              className="uni-input w-full pl-9 pr-3 py-2 text-[14px]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'present', label: 'Present' },
                { id: 'absent', label: 'Absent' },
                { id: 'flagged', label: 'Flagged / Edited' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 text-[14px] font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === f.id
                    ? 'bg-[#681C2D] text-white shadow-xs'
                    : 'text-[#5C5552] hover:bg-[#481321]/10 hover:text-[#481321]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E7DFCE] bg-[#FAF7F0] text-[14px] font-semibold text-[#292929]">
                <th className="py-3 px-6">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE0] text-[14px] font-normal">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[14px] font-normal text-[#5C5552]">
                    No students match the current filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isEditingThis = editingStudentId === student.id;

                  return (
                    <React.Fragment key={student.id}>
                      <tr className="hover:bg-[#FAF7F0]/75 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-[14px] font-normal text-[#5C5552] tabular-nums whitespace-nowrap">
                          {student.rollNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[14px] font-normal text-[#292929]">
                            {student.name}
                          </div>
                          <div className="text-[12px] font-normal text-[#5C5552]">
                            {student.rowLabel || 'Standard seat'}
                            {student.manuallyEdited && ' · Manually verified'}
                          </div>
                          {student.editNote && (
                            <div className="text-[12px] font-normal text-[#681C2D] mt-0.5">
                              Note: {student.editNote}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[14px] font-normal tabular-nums whitespace-nowrap">
                          {student.confidence !== null ? (
                            <span
                              className={
                                student.confidence < confidenceThreshold
                                  ? 'text-amber-700 inline-flex items-center gap-1'
                                  : 'text-[#292929]'
                              }
                            >
                              {student.confidence < confidenceThreshold && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              )}
                              {student.confidence.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[#8C7F78]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`text-[14px] font-normal ${
                              student.status === 'present' ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {student.status === 'present' ? 'Present' : 'Absent'}
                          </span>
                          {student.matchWarning === 'duplicate_match' && (
                            <div className="text-[12px] font-normal text-amber-700">
                              Duplicate match
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          {!locked ? (
                            <button
                              type="button"
                              onClick={() => startEditing(student)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold text-[#681C2D] bg-white hover:bg-[#FAF7F0] border border-[#D6CFC2] hover:border-[#D6A84B] rounded-lg transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>
                                {student.status === 'present' ? 'Mark Absent' : 'Mark Present'}
                              </span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[12px] font-normal text-[#8C7F78]">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Locked</span>
                            </span>
                          )}
                        </td>
                      </tr>

                      {isEditingThis && !locked && (
                        <tr className="bg-[#FAF7F0]">
                          <td colSpan={5} className="px-6 py-3.5">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="text-[14px] font-medium text-[#292929] whitespace-nowrap">
                                Change to{' '}
                                <span
                                  className={
                                    editTargetStatus === 'present'
                                      ? 'text-emerald-700'
                                      : 'text-red-700'
                                  }
                                >
                                  {editTargetStatus === 'present' ? 'Present' : 'Absent'}
                                </span>
                                :
                              </div>
                              <input
                                type="text"
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                placeholder="Enter audit reason (e.g., Verified physically in rear row)..."
                                className="uni-input flex-1 px-3 py-1.5 text-[14px]"
                              />
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => confirmEdit(student)}
                                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-2xs"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Save Change</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingStudentId(null)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[14px] font-semibold text-[#5C5552] hover:text-[#292929] bg-white border border-[#D6CFC2] rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
