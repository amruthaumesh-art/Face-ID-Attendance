import React, { useState } from 'react';
import {
  BookOpen,
  Building2,
  Check,
  Edit3,
  GraduationCap,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type {
  AcademicYear,
  CourseClass,
  LecturerProfile,
  StreamType,
  SubjectItem,
} from '../types/attendance';

interface FacultyClassesManagerProps {
  lecturers: LecturerProfile[];
  classes: CourseClass[];
  subjects: SubjectItem[];
  onAddLecturer: (lecturer: Omit<LecturerProfile, 'id'>) => void;
  onToggleLecturerStatus: (lecturerId: string) => void;
  onAddClass: (course: Omit<CourseClass, 'id'>) => void;
  onAddSubject: (subject: Omit<SubjectItem, 'id'>) => void;
  onUpdateSubject: (subject: SubjectItem) => void;
  onDeleteSubject: (subjectId: string) => void;
}

export const FacultyClassesManager: React.FC<FacultyClassesManagerProps> = ({
  lecturers,
  classes,
  subjects,
  onAddLecturer,
  onToggleLecturerStatus,
  onAddClass,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
}) => {
  const [activeTab, setActiveTab] = useState<'lecturers' | 'classes' | 'subjects'>('lecturers');
  const [yearFilter, setYearFilter] = useState<'all' | AcademicYear>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Add Lecturer state
  const [lecName, setLecName] = useState('');
  const [lecEmail, setLecEmail] = useState('');
  const [lecDept, setLecDept] = useState('Computer Science & Physics');
  const [lecDesignation, setLecDesignation] = useState('Lecturer');
  const [lecSubjects, setLecSubjects] = useState('');
  const [lecYears, setLecYears] = useState<AcademicYear[]>(['1st PUC', '2nd PUC']);

  // Add Class state
  const [clsYear, setClsYear] = useState<AcademicYear>('1st PUC');
  const [clsStream, setClsStream] = useState<StreamType>('Science (PCMC)');
  const [clsCode, setClsCode] = useState('');
  const [clsSection, setClsSection] = useState('Section B');
  const [clsRoom, setClsRoom] = useState('Block A · Room 105');
  const [clsSchedule, setClsSchedule] = useState('Mon–Sat · 09:00 AM');
  const [clsLecturerId, setClsLecturerId] = useState(lecturers[0]?.id || '');

  // Add Subject state
  const [subYear, setSubYear] = useState<AcademicYear>('1st PUC');
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subClassId, setSubClassId] = useState(classes[0]?.id || '');
  const [subLecturerId, setSubLecturerId] = useState(lecturers[0]?.id || '');
  const [subHours, setSubHours] = useState(5);

  // Edit / Delete Subject state
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubYear, setEditSubYear] = useState<AcademicYear>('1st PUC');
  const [editSubCode, setEditSubCode] = useState('');
  const [editSubName, setEditSubName] = useState('');
  const [editSubClassId, setEditSubClassId] = useState('');
  const [editSubLecturerId, setEditSubLecturerId] = useState('');
  const [editSubHours, setEditSubHours] = useState(5);
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState<string | null>(null);

  const filteredClasses = classes.filter((c) =>
    yearFilter === 'all' ? true : c.academicYear === yearFilter
  );
  const filteredSubjects = subjects.filter((s) =>
    yearFilter === 'all' ? true : s.academicYear === yearFilter
  );

  const handleToggleLecYear = (year: AcademicYear) => {
    setLecYears((prev) =>
      prev.includes(year) ? (prev.length > 1 ? prev.filter((y) => y !== year) : prev) : [...prev, year]
    );
  };

  const handleCreateLecturer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lecName.trim() || !lecEmail.trim()) return;
    onAddLecturer({
      name: lecName.trim(),
      email: lecEmail.trim().toLowerCase(),
      department: lecDept.trim(),
      designation: lecDesignation.trim(),
      assignedYears: lecYears,
      subjectsTaught: lecSubjects
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      status: 'Active',
    });
    setLecName('');
    setLecEmail('');
    setLecSubjects('');
    setShowCreateForm(false);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    const assigned = lecturers.find((l) => l.id === clsLecturerId) || lecturers[0];
    if (!clsCode.trim() || !assigned) return;
    onAddClass({
      academicYear: clsYear,
      stream: clsStream,
      code: clsCode.trim().toUpperCase(),
      name: `${clsYear} ${clsStream}`,
      section: clsSection.trim(),
      department: clsStream.startsWith('Science') ? 'Science Stream' : 'Commerce Stream',
      room: clsRoom.trim(),
      schedule: clsSchedule.trim(),
      enrolledCount: 0,
      lecturerId: assigned.id,
      lecturerName: assigned.name,
    });
    setClsCode('');
    setShowCreateForm(false);
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const targetClass =
      classes.find((c) => c.id === subClassId && c.academicYear === subYear) ||
      classes.find((c) => c.academicYear === subYear) ||
      classes[0];
    const assigned = lecturers.find((l) => l.id === subLecturerId) || lecturers[0];
    if (!subCode.trim() || !subName.trim() || !targetClass || !assigned) return;

    onAddSubject({
      code: subCode.trim().toUpperCase(),
      name: subName.trim(),
      academicYear: subYear,
      stream: targetClass.stream,
      classId: targetClass.id,
      lecturerId: assigned.id,
      lecturerName: assigned.name,
      weeklyHours: Number(subHours) || 5,
    });
    setSubCode('');
    setSubName('');
    setShowCreateForm(false);
  };

  const startEditSubject = (sub: SubjectItem) => {
    setEditingSubjectId(sub.id);
    setEditSubYear(sub.academicYear);
    setEditSubCode(sub.code);
    setEditSubName(sub.name);
    setEditSubClassId(sub.classId);
    setEditSubLecturerId(sub.lecturerId);
    setEditSubHours(sub.weeklyHours);
    setConfirmDeleteSubId(null);
  };

  const handleSaveSubjectEdit = (sub: SubjectItem) => {
    if (!editSubCode.trim() || !editSubName.trim()) return;
    const targetClass =
      classes.find((c) => c.id === editSubClassId && c.academicYear === editSubYear) ||
      classes.find((c) => c.academicYear === editSubYear) ||
      classes[0];
    const assigned = lecturers.find((l) => l.id === editSubLecturerId) || lecturers[0];

    onUpdateSubject({
      ...sub,
      code: editSubCode.trim().toUpperCase(),
      name: editSubName.trim(),
      academicYear: editSubYear,
      stream: targetClass?.stream || sub.stream,
      classId: targetClass?.id || sub.classId,
      lecturerId: assigned?.id || sub.lecturerId,
      lecturerName: assigned?.name || sub.lecturerName,
      weeklyHours: Math.max(1, Math.min(10, Number(editSubHours) || 5)),
    });
    setEditingSubjectId(null);
  };

  const subjectYearClasses = classes.filter((c) => c.academicYear === subYear);
  const resolvedSubClassId = subjectYearClasses.some((c) => c.id === subClassId)
    ? subClassId
    : subjectYearClasses[0]?.id || '';

  const editSubjectYearClasses = classes.filter((c) => c.academicYear === editSubYear);
  const resolvedEditSubClassId = editSubjectYearClasses.some((c) => c.id === editSubClassId)
    ? editSubClassId
    : editSubjectYearClasses[0]?.id || '';

  return (
    <div className="space-y-6">
      {/* Management Sub-navigation */}
      <section className="uni-card p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg">
          {(
            [
              { id: 'lecturers', label: `Lecturers (${lecturers.length})`, icon: Users },
              { id: 'classes', label: `Classes (${classes.length})`, icon: Building2 },
              { id: 'subjects', label: `Subjects (${subjects.length})`, icon: BookOpen },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowCreateForm(false);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-[14px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#681C2D] text-white shadow-xs'
                    : 'text-[#5C5552] hover:text-[#481321]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    activeTab === tab.id ? 'text-[#D6A84B]' : 'text-[#8C7F78]'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeTab !== 'lecturers' && (
            <div className="flex items-center gap-1 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg">
              {(['all', '1st PUC', '2nd PUC'] as const).map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setYearFilter(yr)}
                  className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${
                    yearFilter === yr
                      ? 'bg-[#681C2D] text-white'
                      : 'text-[#5C5552] hover:text-[#481321]'
                  }`}
                >
                  {yr === 'all' ? 'All Years' : yr}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-xs transition-colors whitespace-nowrap"
          >
            {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>
              {showCreateForm
                ? 'Close Form'
                : activeTab === 'lecturers'
                  ? 'Add Lecturer'
                  : activeTab === 'classes'
                    ? 'Add PUC Class'
                    : 'Add Subject'}
            </span>
          </button>
        </div>
      </section>

      {/* Creation Form */}
      {showCreateForm && activeTab === 'lecturers' && (
        <form onSubmit={handleCreateLecturer} className="uni-card p-6 space-y-4 border-[#D6A84B]/60">
          <h2 className="font-display text-[22px] font-semibold text-[#292929]">
            Add Faculty Lecturer Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={lecName}
                onChange={(e) => setLecName(e.target.value)}
                placeholder="Prof. Meenakshi Bhat"
                className="uni-input w-full px-3.5 py-2 min-h-[42px]"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Institutional Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                required
                value={lecEmail}
                onChange={(e) => setLecEmail(e.target.value)}
                placeholder="m.bhat@puc.edu"
                className="uni-input w-full px-3.5 py-2 min-h-[42px]"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Department
              </label>
              <input
                type="text"
                value={lecDept}
                onChange={(e) => setLecDept(e.target.value)}
                className="uni-input w-full px-3.5 py-2 min-h-[42px]"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Designation
              </label>
              <input
                type="text"
                value={lecDesignation}
                onChange={(e) => setLecDesignation(e.target.value)}
                className="uni-input w-full px-3.5 py-2 min-h-[42px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Subjects Taught (comma-separated)
              </label>
              <input
                type="text"
                value={lecSubjects}
                onChange={(e) => setLecSubjects(e.target.value)}
                placeholder="Physics, Electronics"
                className="uni-input w-full px-3.5 py-2 min-h-[42px]"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <span className="text-[14px] font-medium text-[#292929]">Assigned Years:</span>
                {(['1st PUC', '2nd PUC'] as const).map((yr) => (
                  <label key={yr} className="inline-flex items-center gap-1.5 text-[14px] text-[#292929]">
                    <input
                      type="checkbox"
                      checked={lecYears.includes(yr)}
                      onChange={() => handleToggleLecYear(yr)}
                      className="accent-[#681C2D]"
                    />
                    <span>{yr}</span>
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-xs transition-colors"
              >
                Create Lecturer
              </button>
            </div>
          </div>
        </form>
      )}

      {showCreateForm && activeTab === 'classes' && (
        <form onSubmit={handleCreateClass} className="uni-card p-6 space-y-4 border-[#D6A84B]/60">
          <h2 className="font-display text-[22px] font-semibold text-[#292929]">
            Add New PUC Class / Section
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Academic Year
              </label>
              <select
                value={clsYear}
                onChange={(e) => setClsYear(e.target.value as AcademicYear)}
                className="uni-input w-full px-3 py-2 min-h-[42px]"
              >
                <option value="1st PUC">1st PUC</option>
                <option value="2nd PUC">2nd PUC</option>
              </select>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Stream Combination
              </label>
              <select
                value={clsStream}
                onChange={(e) => setClsStream(e.target.value as StreamType)}
                className="uni-input w-full px-3 py-2 min-h-[42px]"
              >
                <option value="Science (PCMC)">Science (PCMC)</option>
                <option value="Science (PCMB)">Science (PCMB)</option>
                <option value="Commerce (CEBA)">Commerce (CEBA)</option>
              </select>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Class Code <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={clsCode}
                onChange={(e) => setClsCode(e.target.value)}
                placeholder="1PUC-SC-C"
                className="uni-input w-full px-3.5 py-2 font-mono min-h-[42px]"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Section
              </label>
              <input
                type="text"
                value={clsSection}
                onChange={(e) => setClsSection(e.target.value)}
                className="uni-input w-full px-3.5 py-2 min-h-[42px]"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Classroom / Block
              </label>
              <input
                type="text"
                value={clsRoom}
                onChange={(e) => setClsRoom(e.target.value)}
                className="uni-input w-full px-3.5 py-2 min-h-[42px]"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Class Coordinator / Lecturer
              </label>
              <select
                value={clsLecturerId}
                onChange={(e) => setClsLecturerId(e.target.value)}
                className="uni-input w-full px-3 py-2 min-h-[42px]"
              >
                {lecturers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex-1 min-w-[220px] max-w-md">
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Schedule
              </label>
              <input
                type="text"
                value={clsSchedule}
                onChange={(e) => setClsSchedule(e.target.value)}
                className="uni-input w-full px-3.5 py-2 min-h-[42px]"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-xs transition-colors"
            >
              Create Class
            </button>
          </div>
        </form>
      )}

      {showCreateForm && activeTab === 'subjects' && (
        <form onSubmit={handleCreateSubject} className="uni-card p-6 space-y-4 border-[#D6A84B]/60">
          <h2 className="font-display text-[22px] font-semibold text-[#292929]">
            Add PUC Subject Assignment
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Academic Year
              </label>
              <select
                value={subYear}
                onChange={(e) => setSubYear(e.target.value as AcademicYear)}
                className="uni-input w-full px-3 py-2 min-h-[42px]"
              >
                <option value="1st PUC">1st PUC</option>
                <option value="2nd PUC">2nd PUC</option>
              </select>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Subject Code <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={subCode}
                onChange={(e) => setSubCode(e.target.value)}
                placeholder="CHE-101"
                className="uni-input w-full px-3.5 py-2 font-mono min-h-[42px]"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Subject Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="Chemistry"
                className="uni-input w-full px-3.5 py-2 min-h-[42px]"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Linked Class
              </label>
              <select
                value={resolvedSubClassId}
                onChange={(e) => setSubClassId(e.target.value)}
                className="uni-input w-full px-3 py-2 min-h-[42px]"
              >
                {subjectYearClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.name} ({c.section})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Assigned Lecturer
              </label>
              <select
                value={subLecturerId}
                onChange={(e) => setSubLecturerId(e.target.value)}
                className="uni-input w-full px-3 py-2 min-h-[42px]"
              >
                {lecturers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#292929] mb-1.5">
                Weekly Hours
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={subHours}
                onChange={(e) => setSubHours(Number(e.target.value))}
                className="uni-input w-full px-3.5 py-2 font-mono min-h-[42px]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-xs transition-colors"
            >
              Assign Subject
            </button>
          </div>
        </form>
      )}

      {/* Active Data Table */}
      {activeTab === 'lecturers' && (
        <section className="uni-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E7DFCE]">
            <h2 className="font-display text-[22px] font-semibold text-[#292929]">
              PUC Faculty &amp; Lecturer Directory
            </h2>
            <p className="text-[12px] font-normal text-[#5C5552] mt-0.5">
              Manage assigned lecturers across 1st PUC and 2nd PUC streams
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E7DFCE] bg-[#FAF7F0] text-[14px] font-medium text-[#292929]">
                  <th className="py-3 px-6">Lecturer &amp; Email</th>
                  <th className="py-3 px-4">Department &amp; Role</th>
                  <th className="py-3 px-4">Academic Years</th>
                  <th className="py-3 px-4">Subjects Taught</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE0] text-[14px] font-normal">
                {lecturers.map((lec) => (
                  <tr key={lec.id} className="hover:bg-[#FAF7F0]/80 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="text-[#292929] font-medium">{lec.name}</div>
                      <div className="text-[12px] text-[#5C5552]">{lec.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[#292929]">{lec.department}</div>
                      <div className="text-[12px] text-[#5C5552]">{lec.designation}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1.5">
                        {lec.assignedYears.map((yr) => (
                          <span
                            key={yr}
                            className="px-2 py-0.5 text-[12px] font-medium bg-[#FAF7F0] text-[#681C2D] border border-[#D6A84B]/50 rounded"
                          >
                            {yr}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5C5552]">
                      {lec.subjectsTaught.join(', ') || 'General'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 text-[12px] font-medium rounded-md border ${
                          lec.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {lec.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onToggleLecturerStatus(lec.id)}
                        className="px-3 py-1.5 text-[13px] font-semibold text-[#681C2D] bg-white hover:bg-[#481321] hover:text-white border border-[#D6CFC2] hover:border-[#481321] rounded-lg transition-colors"
                      >
                        {lec.status === 'Active' ? 'Set On Leave' : 'Set Active'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'classes' && (
        <section className="uni-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E7DFCE]">
            <h2 className="font-display text-[22px] font-semibold text-[#292929]">
              1st PUC &amp; 2nd PUC Class Sections
            </h2>
            <p className="text-[12px] font-normal text-[#5C5552] mt-0.5">
              Configured classroom batches, streams, rooms, and enrolled student counts
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E7DFCE] bg-[#FAF7F0] text-[14px] font-medium text-[#292929]">
                  <th className="py-3 px-6">Year &amp; Code</th>
                  <th className="py-3 px-4">Class &amp; Stream</th>
                  <th className="py-3 px-4">Room &amp; Schedule</th>
                  <th className="py-3 px-4">Coordinator</th>
                  <th className="py-3 px-6 text-right">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE0] text-[14px] font-normal">
                {filteredClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-[#FAF7F0]/80 transition-colors">
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <div className="text-[12px] font-semibold text-[#681C2D]">
                        {cls.academicYear}
                      </div>
                      <div className="font-mono text-[#292929]">{cls.code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[#292929] font-medium">{cls.name}</div>
                      <div className="text-[12px] text-[#5C5552]">{cls.section}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[#292929]">{cls.room}</div>
                      <div className="text-[12px] text-[#5C5552]">{cls.schedule}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5C5552]">{cls.lecturerName}</td>
                    <td className="py-3.5 px-6 text-right font-mono font-semibold text-[#292929] tabular-nums">
                      {cls.enrolledCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'subjects' && (
        <section className="uni-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E7DFCE] flex items-center justify-between">
            <div>
              <h2 className="font-display text-[22px] font-semibold text-[#292929]">
                PUC Curriculum Subjects
              </h2>
              <p className="text-[12px] font-normal text-[#5C5552] mt-0.5">
                Add, edit, or remove subjects available to lecturers in Step 1 of Capture Attendance
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-[#5C5552]">
              <GraduationCap className="w-4 h-4 text-[#D6A84B]" />
              <span>{filteredSubjects.length} subjects</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E7DFCE] bg-[#FAF7F0] text-[14px] font-medium text-[#292929]">
                  <th className="py-3 px-6">Year &amp; Code</th>
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Stream</th>
                  <th className="py-3 px-4">Assigned Lecturer</th>
                  <th className="py-3 px-4 text-right">Weekly Hours</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE0] text-[14px] font-normal">
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#5C5552]">
                      No subjects configured for this filter. Use Add Subject above to create one.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((sub) => {
                    const isEditing = editingSubjectId === sub.id;
                    const isConfirmingDelete = confirmDeleteSubId === sub.id;

                    return (
                      <React.Fragment key={sub.id}>
                        <tr className="hover:bg-[#FAF7F0]/80 transition-colors">
                          <td className="py-3.5 px-6 whitespace-nowrap">
                            <div className="text-[12px] font-semibold text-[#681C2D]">
                              {sub.academicYear}
                            </div>
                            <div className="font-mono text-[#292929]">{sub.code}</div>
                          </td>
                          <td className="py-3.5 px-4 text-[#292929] font-medium">{sub.name}</td>
                          <td className="py-3.5 px-4 text-[#5C5552]">{sub.stream}</td>
                          <td className="py-3.5 px-4 text-[#5C5552]">{sub.lecturerName}</td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#292929]">
                            {sub.weeklyHours} hrs/wk
                          </td>
                          <td className="py-3.5 px-6 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  isEditing ? setEditingSubjectId(null) : startEditSubject(sub)
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[13px] font-semibold text-[#681C2D] bg-white hover:bg-[#481321] hover:text-white border border-[#D6CFC2] hover:border-[#481321] rounded-lg transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{isEditing ? 'Close' : 'Edit'}</span>
                              </button>
                              {isConfirmingDelete ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteSubject(sub.id);
                                      setConfirmDeleteSubId(null);
                                      if (isEditing) setEditingSubjectId(null);
                                    }}
                                    className="px-2.5 py-1.5 text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteSubId(null)}
                                    className="px-2 py-1.5 text-[13px] font-semibold text-[#5C5552] bg-white border border-[#D6CFC2] rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteSubId(sub.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[13px] font-semibold text-red-700 bg-white hover:bg-red-50 border border-[#D6CFC2] hover:border-red-200 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isEditing && (
                          <tr className="bg-[#FAF7F0]">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                                <div>
                                  <label className="block text-[12px] font-medium text-[#292929] mb-1">
                                    Academic Year
                                  </label>
                                  <select
                                    value={editSubYear}
                                    onChange={(e) =>
                                      setEditSubYear(e.target.value as AcademicYear)
                                    }
                                    className="uni-input w-full px-2.5 py-1.5 text-[13px] min-h-[38px]"
                                  >
                                    <option value="1st PUC">1st PUC</option>
                                    <option value="2nd PUC">2nd PUC</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[12px] font-medium text-[#292929] mb-1">
                                    Subject Code
                                  </label>
                                  <input
                                    type="text"
                                    value={editSubCode}
                                    onChange={(e) => setEditSubCode(e.target.value)}
                                    className="uni-input w-full px-2.5 py-1.5 text-[13px] font-mono min-h-[38px]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[12px] font-medium text-[#292929] mb-1">
                                    Subject Name
                                  </label>
                                  <input
                                    type="text"
                                    value={editSubName}
                                    onChange={(e) => setEditSubName(e.target.value)}
                                    className="uni-input w-full px-2.5 py-1.5 text-[13px] min-h-[38px]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[12px] font-medium text-[#292929] mb-1">
                                    Linked Class
                                  </label>
                                  <select
                                    value={resolvedEditSubClassId}
                                    onChange={(e) => setEditSubClassId(e.target.value)}
                                    className="uni-input w-full px-2.5 py-1.5 text-[13px] min-h-[38px]"
                                  >
                                    {editSubjectYearClasses.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.code} ({c.section})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[12px] font-medium text-[#292929] mb-1">
                                    Assigned Lecturer
                                  </label>
                                  <select
                                    value={editSubLecturerId}
                                    onChange={(e) => setEditSubLecturerId(e.target.value)}
                                    className="uni-input w-full px-2.5 py-1.5 text-[13px] min-h-[38px]"
                                  >
                                    {lecturers.map((l) => (
                                      <option key={l.id} value={l.id}>
                                        {l.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-end gap-2">
                                  <div className="w-20">
                                    <label className="block text-[12px] font-medium text-[#292929] mb-1">
                                      Hrs/Wk
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={10}
                                      value={editSubHours}
                                      onChange={(e) => setEditSubHours(Number(e.target.value))}
                                      className="uni-input w-full px-2.5 py-1.5 text-[13px] font-mono min-h-[38px]"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveSubjectEdit(sub)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg min-h-[38px]"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Save</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSubjectId(null)}
                                    className="inline-flex items-center justify-center px-2.5 py-1.5 text-[13px] font-semibold text-[#5C5552] bg-white border border-[#D6CFC2] rounded-lg min-h-[38px]"
                                    aria-label="Cancel edit"
                                  >
                                    <X className="w-3.5 h-3.5" />
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
      )}
    </div>
  );
};
