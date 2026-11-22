import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
  Camera,
} from 'lucide-react';
import { buildPucAttendanceReport } from '../services/api';
import type {
  AcademicYear,
  AttendanceSession,
  CourseClass,
  EnrolledStudent,
  EnrollmentStatus,
} from '../types/attendance';

interface PucRecordsViewProps {
  academicYear: AcademicYear;
  classes: CourseClass[];
  students: EnrolledStudent[];
  sessions: AttendanceSession[];
  confidenceThreshold: number;
  onAddStudent: (student: Omit<EnrolledStudent, 'id'>) => void;
  onUpdateStudent: (student: EnrolledStudent) => void;
  onDeleteStudent: (studentId: string) => void;
  /** Live classes only: upload one face photo for a student to the backend. */
  onEnrollFace?: (student: EnrolledStudent, file: File) => Promise<string>;
  onInspectSession: (sessionId: string) => void;
}

export const PucRecordsView: React.FC<PucRecordsViewProps> = ({
  academicYear,
  classes,
  students,
  sessions,
  confidenceThreshold,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onEnrollFace,
  onInspectSession,
}) => {
  const [faceStatus, setFaceStatus] = useState<Record<string, string>>({});
  const liveClassIds = new Set(classes.filter((c) => c.isLive).map((c) => c.id));

  const handleFaceFile = async (stu: EnrolledStudent, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!onEnrollFace || files.length === 0) return;
    let ok = 0;
    let lastError = '';
    setFaceStatus((p) => ({ ...p, [stu.id]: 'Uploading…' }));
    for (const file of files) {
      try {
        await onEnrollFace(stu, file);
        ok += 1;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
    setFaceStatus((p) => ({
      ...p,
      [stu.id]:
        ok === files.length
          ? `${ok} face photo(s) enrolled`
          : `${ok}/${files.length} enrolled. ${lastError}`,
    }));
  };
  const [activeTab, setActiveTab] = useState<'students' | 'reports'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EnrollmentStatus>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Student form state
  const yearClasses = classes.filter((c) => c.academicYear === academicYear);
  const [newName, setNewName] = useState('');
  const [newRoll, setNewRoll] = useState('');
  const [newClassId, setNewClassId] = useState<string>(yearClasses[0]?.id || '');
  const [newDefaultRow, setNewDefaultRow] = useState('Row 1 (Front)');
  const [newEnrollStatus, setNewEnrollStatus] = useState<EnrollmentStatus>('Enrolled');

  // Inline Edit Student state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoll, setEditRoll] = useState('');
  const [editRow, setEditRow] = useState('Row 1 (Front)');
  const [editStatus, setEditStatus] = useState<EnrollmentStatus>('Enrolled');

  const report = buildPucAttendanceReport(academicYear, classes, sessions, students);
  const yearStudents = students.filter((s) => s.academicYear === academicYear);
  const yearSessions = sessions.filter((s) => s.academicYear === academicYear);

  const effectiveClassId =
    yearClasses.some((c) => c.id === newClassId) ? newClassId : yearClasses[0]?.id || '';

  const filteredStudents = yearStudents.filter((stu) => {
    if (classFilter !== 'all' && stu.classId !== classFilter) return false;
    if (statusFilter !== 'all' && stu.enrollmentStatus !== statusFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      stu.name.toLowerCase().includes(q) ||
      stu.rollNumber.toLowerCase().includes(q) ||
      stu.program.toLowerCase().includes(q)
    );
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const targetClass = yearClasses.find((c) => c.id === effectiveClassId) || yearClasses[0];
    if (!targetClass || !newName.trim() || !newRoll.trim()) return;

    onAddStudent({
      academicYear,
      classId: targetClass.id,
      rollNumber: newRoll.trim().toUpperCase(),
      name: newName.trim(),
      program: targetClass.stream,
      section: targetClass.section,
      defaultRow: newDefaultRow,
      enrollmentStatus: newEnrollStatus,
    });

    setNewName('');
    setNewRoll('');
    setNewDefaultRow('Row 1 (Front)');
    setNewEnrollStatus('Enrolled');
    setShowAddForm(false);
  };

  const startEditing = (stu: EnrolledStudent) => {
    setEditingStudentId(stu.id);
    setEditName(stu.name);
    setEditRoll(stu.rollNumber);
    setEditRow(stu.defaultRow);
    setEditStatus(stu.enrollmentStatus);
  };

  const saveEdit = (original: EnrolledStudent) => {
    if (!editName.trim() || !editRoll.trim()) return;
    onUpdateStudent({
      ...original,
      name: editName.trim(),
      rollNumber: editRoll.trim().toUpperCase(),
      defaultRow: editRow,
      enrollmentStatus: editStatus,
    });
    setEditingStudentId(null);
  };

  const handleExportYearReportCsv = () => {
    const header = [
      'Academic Year',
      'Class Code',
      'Class Name',
      'Section',
      'Room',
      'Lecturer',
      'Enrolled Students',
      'Sessions Held',
      'Attendance (%)',
      'Avg Confidence (%)',
    ];
    const rows = report.classBreakdown.map((item) => [
      academicYear,
      item.classItem.code,
      `"${item.classItem.name}"`,
      item.classItem.section,
      `"${item.classItem.room}"`,
      `"${item.classItem.lecturerName}"`,
      item.classItem.enrolledCount,
      item.sessionsHeld,
      item.attendancePct,
      item.avgConfidence,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute(
      'download',
      `faceid_${academicYear.replace(/\s+/g, '_').toLowerCase()}_report.csv`
    );
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* KPI Overview for this PUC Year */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="uni-card p-5">
          <div className="text-[14px] font-medium text-[#5C5552]">
            {academicYear} Students
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold text-[#292929] tabular-nums">
              {report.totalStudents}
            </span>
            <span className="text-[12px] font-normal text-[#5C5552] tabular-nums">
              {report.enrolledActive} enrolled · {report.pendingPhotos} pending
            </span>
          </div>
        </div>

        <div className="uni-card p-5">
          <div className="text-[14px] font-medium text-[#5C5552]">Active Classes</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold text-[#292929] tabular-nums">
              {report.totalClasses}
            </span>
            <span className="text-[12px] font-normal text-[#5C5552]">
              Science &amp; Commerce
            </span>
          </div>
        </div>

        <div className="uni-card p-5">
          <div className="text-[14px] font-medium text-[#5C5552]">
            {academicYear} Attendance Rate
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold text-[#681C2D] tabular-nums">
              {report.overallPct}%
            </span>
            <span className="text-[12px] font-normal text-[#5C5552] tabular-nums">
              Across {report.totalSessions} session(s)
            </span>
          </div>
        </div>

        <div className="uni-card p-5">
          <div className="text-[14px] font-medium text-[#5C5552]">Photo Readiness</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold text-emerald-700 tabular-nums">
              {report.totalStudents > 0
                ? Math.round((report.enrolledActive / report.totalStudents) * 100)
                : 0}
              %
            </span>
            <span className="text-[12px] font-normal text-[#5C5552]">
              Ready for face matching
            </span>
          </div>
        </div>
      </section>

      {/* Tab Switcher + Actions */}
      <section className="uni-card p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-[14px] font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'students'
                ? 'bg-[#681C2D] text-white shadow-xs'
                : 'text-[#5C5552] hover:text-[#481321]'
            }`}
          >
            <Users
              className={`w-4 h-4 ${
                activeTab === 'students' ? 'text-[#D6A84B]' : 'text-[#8C7F78]'
              }`}
            />
            <span>Student Roster Management ({yearStudents.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-[14px] font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-[#681C2D] text-white shadow-xs'
                : 'text-[#5C5552] hover:text-[#481321]'
            }`}
          >
            <FileSpreadsheet
              className={`w-4 h-4 ${
                activeTab === 'reports' ? 'text-[#D6A84B]' : 'text-[#8C7F78]'
              }`}
            />
            <span>{academicYear} Attendance Reports</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === 'students' ? (
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              {showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              <span>{showAddForm ? 'Close Form' : `Add ${academicYear} Student`}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExportYearReportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Export {academicYear} Report CSV</span>
            </button>
          )}
        </div>
      </section>

      {activeTab === 'students' ? (
        <div className="space-y-6">
          {/* Add Student Form */}
          {showAddForm && (
            <form onSubmit={handleCreateStudent} className="uni-card p-6 space-y-4 border-[#D6A84B]/60">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE0]">
                <h2 className="font-display text-[22px] font-semibold text-[#292929]">
                  Enroll New {academicYear} Student
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-[#8C7F78] hover:text-[#481321]"
                  aria-label="Close add student form"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                    Student Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Rakshith Kulkarni"
                    className="uni-input w-full px-3.5 py-2 min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                    Roll Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoll}
                    onChange={(e) => setNewRoll(e.target.value)}
                    placeholder={academicYear === '1st PUC' ? '26PUC1SA15' : '25PUC2SA15'}
                    className="uni-input w-full px-3.5 py-2 font-mono min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                    Class &amp; Section
                  </label>
                  <select
                    value={effectiveClassId}
                    onChange={(e) => setNewClassId(e.target.value)}
                    className="uni-input w-full px-3 py-2 min-h-[42px]"
                  >
                    {yearClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.stream} ({c.section})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                    Default Bench Row
                  </label>
                  <select
                    value={newDefaultRow}
                    onChange={(e) => setNewDefaultRow(e.target.value)}
                    className="uni-input w-full px-3 py-2 min-h-[42px]"
                  >
                    <option value="Row 1 (Front)">Row 1 (Front)</option>
                    <option value="Row 2 (Middle)">Row 2 (Middle)</option>
                    <option value="Row 3 (Rear)">Row 3 (Rear)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-medium text-[#292929]">Enrollment Status:</span>
                  {(['Enrolled', 'Pending Photo', 'Inactive'] as const).map((status) => (
                    <label
                      key={status}
                      className="inline-flex items-center gap-1.5 text-[14px] font-normal text-[#292929] cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="newEnrollStatus"
                        checked={newEnrollStatus === status}
                        onChange={() => setNewEnrollStatus(status)}
                        className="accent-[#681C2D]"
                      />
                      <span>{status}</span>
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Student Record</span>
                </button>
              </div>
            </form>
          )}

          {/* Student Roster Filter & Table */}
          <section className="uni-card overflow-hidden">
            <div className="p-4 sm:px-6 border-b border-[#E7DFCE] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#8C7F78] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${academicYear} students by name or roll number...`}
                  className="uni-input w-full pl-9 pr-3 py-2 min-h-[40px]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  aria-label="Filter by class"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="uni-input px-3 py-2 text-[14px] min-h-[40px]"
                >
                  <option value="all">All {academicYear} Classes</option>
                  {yearClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.stream}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by enrollment status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | EnrollmentStatus)
                  }
                  className="uni-input px-3 py-2 text-[14px] min-h-[40px]"
                >
                  <option value="all">All Statuses</option>
                  <option value="Enrolled">Enrolled</option>
                  <option value="Pending Photo">Pending Photo</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E7DFCE] bg-[#FAF7F0] text-[14px] font-medium text-[#292929]">
                    <th className="py-3 px-6">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Stream &amp; Section</th>
                    <th className="py-3 px-4">Seat Row</th>
                    <th className="py-3 px-4">Enrollment Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE0] text-[14px] font-normal">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#5C5552]">
                        No {academicYear} students match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((stu) => {
                      const isEditing = editingStudentId === stu.id;
                      return (
                        <tr key={stu.id} className="hover:bg-[#FAF7F0]/80 transition-colors">
                          <td className="py-3 px-6 font-mono text-[#5C5552] tabular-nums whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editRoll}
                                onChange={(e) => setEditRoll(e.target.value)}
                                className="uni-input px-2.5 py-1 w-32 font-mono"
                              />
                            ) : (
                              stu.rollNumber
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#292929] font-medium whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="uni-input px-2.5 py-1 w-44"
                              />
                            ) : (
                              stu.name
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#5C5552] whitespace-nowrap">
                            {stu.program} · {stu.section}
                          </td>
                          <td className="py-3 px-4 text-[#5C5552] whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={editRow}
                                onChange={(e) => setEditRow(e.target.value)}
                                className="uni-input px-2 py-1"
                              >
                                <option value="Row 1 (Front)">Row 1 (Front)</option>
                                <option value="Row 2 (Middle)">Row 2 (Middle)</option>
                                <option value="Row 3 (Rear)">Row 3 (Rear)</option>
                              </select>
                            ) : (
                              stu.defaultRow
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={editStatus}
                                onChange={(e) =>
                                  setEditStatus(e.target.value as EnrollmentStatus)
                                }
                                className="uni-input px-2 py-1"
                              >
                                <option value="Enrolled">Enrolled</option>
                                <option value="Pending Photo">Pending Photo</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-md border ${
                                  stu.enrollmentStatus === 'Enrolled'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : stu.enrollmentStatus === 'Pending Photo'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-[#FAF7F0] text-[#5C5552] border-[#E7DFCE]'
                                }`}
                              >
                                {stu.enrollmentStatus}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-6 text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveEdit(stu)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-md"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingStudentId(null)}
                                  className="px-2.5 py-1 text-[12px] font-semibold text-[#5C5552] bg-white border border-[#D6CFC2] rounded-md"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2">
                                {onEnrollFace && liveClassIds.has(stu.classId) && (
                                  <label
                                    title="Upload clear single-face photos (4-8 recommended)"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-md cursor-pointer"
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>Face</span>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => void handleFaceFile(stu, e)}
                                    />
                                  </label>
                                )}
                                {faceStatus[stu.id] && (
                                  <span className="text-[11px] text-[#5C5552] max-w-[180px] whitespace-normal text-left">
                                    {faceStatus[stu.id]}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => startEditing(stu)}
                                  aria-label={`Edit ${stu.name}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold text-[#681C2D] bg-white hover:bg-[#481321] hover:text-white border border-[#D6CFC2] hover:border-[#481321] rounded-md transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteStudent(stu.id)}
                                  aria-label={`Remove ${stu.name}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-semibold text-red-700 bg-white hover:bg-red-50 border border-[#D6CFC2] rounded-md"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Class-wise Attendance Report */}
          <section className="uni-card overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E7DFCE]">
              <h2 className="font-display text-[22px] font-semibold text-[#292929]">
                {academicYear} Class-Wise Attendance Report
              </h2>
              <p className="text-[12px] font-normal text-[#5C5552] mt-0.5">
                Aggregated lecture attendance percentages and recognition confidence per class
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E7DFCE] bg-[#FAF7F0] text-[14px] font-medium text-[#292929]">
                    <th className="py-3 px-6">Class &amp; Stream</th>
                    <th className="py-3 px-4">Class Teacher / Lecturer</th>
                    <th className="py-3 px-4 text-right">Enrolled</th>
                    <th className="py-3 px-4 text-right">Sessions Held</th>
                    <th className="py-3 px-4 text-right">Attendance %</th>
                    <th className="py-3 px-6 text-right">Avg Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE0] text-[14px] font-normal">
                  {report.classBreakdown.map((item) => (
                    <tr key={item.classItem.id} className="hover:bg-[#FAF7F0]/80 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="text-[#292929] font-medium">
                          {item.classItem.code} · {item.classItem.name}
                        </div>
                        <div className="text-[12px] text-[#5C5552]">
                          {item.classItem.section} · {item.classItem.room}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#5C5552] whitespace-nowrap">
                        {item.classItem.lecturerName}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#292929]">
                        {item.classItem.enrolledCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#292929]">
                        {item.sessionsHeld}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#681C2D] tabular-nums">
                        {item.sessionsHeld > 0 ? `${item.attendancePct}%` : '—'}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono tabular-nums">
                        {item.sessionsHeld > 0 ? (
                          <span
                            className={
                              item.avgConfidence < confidenceThreshold
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }
                          >
                            {item.avgConfidence}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Session History for this PUC Year */}
          <section className="uni-card overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E7DFCE] flex items-center justify-between">
              <div>
                <h2 className="font-display text-[22px] font-semibold text-[#292929]">
                  {academicYear} Recorded Lecture Sessions
                </h2>
                <p className="text-[12px] font-normal text-[#5C5552] mt-0.5">
                  Click any session to inspect student-level attendance details
                </p>
              </div>
              <span className="text-[12px] text-[#5C5552] tabular-nums">
                {yearSessions.length} sessions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E7DFCE] bg-[#FAF7F0] text-[14px] font-medium text-[#292929]">
                    <th className="py-3 px-6">Subject &amp; Topic</th>
                    <th className="py-3 px-4">Class &amp; Lecturer</th>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4 text-right">Present / Enrolled</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE0] text-[14px] font-normal">
                  {yearSessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#5C5552]">
                        No sessions captured yet for {academicYear}.
                      </td>
                    </tr>
                  ) : (
                    yearSessions.map((ses) => (
                      <tr key={ses.id} className="hover:bg-[#FAF7F0]/80 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="text-[#292929] font-medium">
                            {ses.subjectCode} · {ses.subjectName}
                          </div>
                          <div className="text-[12px] text-[#5C5552]">
                            {ses.topicName || 'General Lecture'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[#292929]">
                            {ses.classCode} ({ses.section})
                          </div>
                          <div className="text-[12px] text-[#5C5552]">{ses.lecturerName}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[#5C5552] tabular-nums whitespace-nowrap">
                          {ses.date} · {ses.startTime}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#292929]">
                          {ses.presentCount} / {ses.enrolledCount}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => onInspectSession(ses.id)}
                            className="px-3 py-1.5 text-[14px] font-semibold text-[#681C2D] bg-white hover:bg-[#481321] hover:text-white border border-[#D6CFC2] hover:border-[#481321] rounded-lg transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
