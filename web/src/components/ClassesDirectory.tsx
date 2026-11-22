import React, { useState } from 'react';
import { BookOpen, Camera, ChevronDown, ChevronUp, Users } from 'lucide-react';
import type {
  AcademicYear,
  CourseClass,
  EnrolledStudent,
  SubjectItem,
  UserRole,
} from '../types/attendance';

interface ClassesDirectoryProps {
  role: UserRole;
  classes: CourseClass[];
  subjects: SubjectItem[];
  students: EnrolledStudent[];
  onStartCapture?: (classId: string) => void;
}

export const ClassesDirectory: React.FC<ClassesDirectoryProps> = ({
  role,
  classes,
  subjects,
  students,
  onStartCapture,
}) => {
  const [yearFilter, setYearFilter] = useState<'all' | AcademicYear>('all');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(
    classes[0]?.id ?? null
  );

  const visibleClasses = classes.filter((c) =>
    yearFilter === 'all' ? true : c.academicYear === yearFilter
  );

  return (
    <div className="space-y-6">
      <div className="uni-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-[22px] font-semibold text-[#292929]">
            {role === 'admin' ? 'PUC Course & Roster Directory' : 'My Assigned PUC Classes'}
          </h2>
          <p className="text-[12px] font-normal text-[#5C5552] mt-0.5">
            {visibleClasses.length} active class(es) · Inspect subjects, student rosters, or launch classroom capture
          </p>
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
      </div>

      <div className="grid grid-cols-1 gap-4">
        {visibleClasses.map((course) => {
          const isExpanded = expandedClassId === course.id;
          const roster = students.filter(
            (st) => st.classId === course.id && st.academicYear === course.academicYear
          );
          const classSubjects = subjects.filter((sub) => sub.classId === course.id);

          return (
            <div key={course.id} className="uni-card overflow-hidden">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[12px] font-normal text-[#5C5552] mb-1">
                    <span className="px-1.5 py-0.5 font-semibold bg-[#FAF7F0] text-[#681C2D] border border-[#D6A84B]/60 rounded">
                      {course.academicYear}
                    </span>
                    <span className="font-mono font-semibold text-[#681C2D]">{course.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{course.section}</span>
                    <span aria-hidden="true">·</span>
                    <span>{course.room}</span>
                  </div>
                  <h3 className="font-display text-[18px] font-semibold text-[#292929]">
                    {course.name}
                  </h3>
                  <div className="text-[12px] font-normal text-[#5C5552] mt-1">
                    {course.schedule} · Coordinator: {course.lecturerName}
                  </div>
                  {classSubjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-[#681C2D] font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-[#D6A84B] shrink-0" />
                      <span>
                        Subjects: {classSubjects.map((s) => `${s.code} (${s.name})`).join(' · ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="inline-flex items-center gap-1.5 text-[14px] font-normal text-[#292929] px-3 py-1.5 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg tabular-nums">
                    <Users className="w-3.5 h-3.5 text-[#681C2D]" />
                    <span>{roster.length} enrolled</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedClassId(isExpanded ? null : course.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-[14px] font-semibold text-[#681C2D] hover:bg-[#FAF7F0] border border-[#D6CFC2] hover:border-[#D6A84B] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <span>{isExpanded ? 'Hide Roster' : 'View Roster'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {role === 'lecturer' && onStartCapture && (
                    <button
                      type="button"
                      onClick={() => onStartCapture(course.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg shadow-xs transition-colors whitespace-nowrap"
                    >
                      <Camera className="w-4 h-4 text-[#481321]" />
                      <span>Take Attendance</span>
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-[#E7DFCE] bg-[#FAF7F0]/80 px-5 py-4">
                  <div className="text-[16px] font-medium text-[#292929] mb-3">
                    Enrolled Roster ({roster.length} Students)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {roster.map((student) => (
                      <div
                        key={student.id}
                        className="bg-white border border-[#E7DFCE] rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-[14px] font-normal text-[#292929] truncate">
                            {student.name}
                          </div>
                          <div className="font-mono text-[12px] font-normal text-[#5C5552] tabular-nums">
                            {student.rollNumber} · {student.defaultRow}
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded border whitespace-nowrap ${
                            student.enrollmentStatus === 'Enrolled'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : student.enrollmentStatus === 'Pending Photo'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {student.enrollmentStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
