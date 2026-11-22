import React, { useState } from 'react';
import { Download, Search } from 'lucide-react';
import type { AcademicYear, AuditLogEntry } from '../types/attendance';

interface AuditLogViewProps {
  auditLogs: AuditLogEntry[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ auditLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'lecturer' | 'admin'>('all');
  const [yearFilter, setYearFilter] = useState<'all' | AcademicYear>('all');

  const filteredLogs = auditLogs.filter((entry) => {
    if (roleFilter !== 'all' && entry.changedByRole !== roleFilter) return false;
    if (yearFilter !== 'all' && entry.academicYear !== yearFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.studentName.toLowerCase().includes(q) ||
      entry.rollNumber.toLowerCase().includes(q) ||
      entry.changedByName.toLowerCase().includes(q) ||
      entry.classCode.toLowerCase().includes(q) ||
      entry.subjectName.toLowerCase().includes(q) ||
      entry.reason.toLowerCase().includes(q)
    );
  });

  const handleExportAuditCsv = () => {
    const header = [
      'Timestamp',
      'Academic Year',
      'Changed By',
      'Role',
      'Class Code',
      'Subject',
      'Session Date',
      'Roll Number',
      'Student Name',
      'Previous Status',
      'New Status',
      'Reason',
    ];
    const rows = filteredLogs.map((l) => [
      new Date(l.changedAt).toISOString(),
      l.academicYear,
      `"${l.changedByName}"`,
      l.changedByRole,
      l.classCode,
      `"${l.subjectName}"`,
      l.sessionDate,
      l.rollNumber,
      `"${l.studentName}"`,
      l.previousStatus,
      l.newStatus,
      `"${l.reason.replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `faceid_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="uni-card p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-[#8C7F78] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, lecturer, subject, class, or reason..."
              className="uni-input w-full pl-9 pr-3 py-2 text-[14px] min-h-[42px]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg self-start">
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

          <div className="flex items-center gap-1 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg self-start">
            {(
              [
                { id: 'all', label: 'All Actors' },
                { id: 'lecturer', label: 'Lecturers' },
                { id: 'admin', label: 'Admins' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1.5 text-[14px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                  roleFilter === tab.id
                    ? 'bg-[#681C2D] text-white shadow-xs'
                    : 'text-[#5C5552] hover:bg-[#481321]/10 hover:text-[#481321]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportAuditCsv}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-[14px] font-semibold text-[#292929] bg-[#D6A84B] hover:bg-[#C39538] rounded-lg transition-colors whitespace-nowrap min-h-[42px]"
        >
          <Download className="w-4 h-4 text-[#481321]" />
          <span>Export Audit CSV</span>
        </button>
      </section>

      <section className="uni-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E7DFCE] flex items-center justify-between">
          <div>
            <h2 className="font-display text-[22px] font-semibold text-[#292929]">
              Immutable Attendance Modification Log
            </h2>
            <p className="text-[12px] font-normal text-[#5C5552] mt-0.5">
              Tracks every manual override across 1st PUC and 2nd PUC sessions
            </p>
          </div>
          <span className="text-[12px] font-normal text-[#5C5552] tabular-nums">
            {filteredLogs.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E7DFCE] bg-[#FAF7F0] text-[14px] font-semibold text-[#292929]">
                <th className="py-3 px-6">Changed At</th>
                <th className="py-3 px-4">Modified By</th>
                <th className="py-3 px-4">Year, Class &amp; Subject</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Status Change</th>
                <th className="py-3 px-6">Justification Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE0] text-[14px] font-normal">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[14px] font-normal text-[#5C5552]">
                    No audit entries match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#FAF7F0]/75 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-[14px] font-normal text-[#5C5552] tabular-nums whitespace-nowrap">
                      {new Date(entry.changedAt).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-[14px] font-normal text-[#292929]">
                        {entry.changedByName}
                      </div>
                      <div className="text-[12px] font-normal text-[#5C5552]">
                        {entry.changedByRole === 'admin' ? 'Administrator' : 'Lecturer'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-[#FAF7F0] text-[#681C2D] border border-[#D6A84B]/60 rounded">
                          {entry.academicYear}
                        </span>
                        <span className="text-[14px] font-normal text-[#292929]">
                          {entry.classCode} · {entry.subjectName}
                        </span>
                      </div>
                      <div className="text-[12px] font-normal text-[#5C5552] tabular-nums mt-0.5">
                        {entry.sessionDate}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-[14px] font-normal text-[#292929]">
                        {entry.studentName}
                      </div>
                      <div className="font-mono text-[12px] font-normal text-[#5C5552] tabular-nums">
                        {entry.rollNumber}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[14px] font-normal whitespace-nowrap">
                      <span
                        className={
                          entry.previousStatus === 'present' ? 'text-emerald-700' : 'text-red-700'
                        }
                      >
                        {entry.previousStatus}
                      </span>
                      <span className="text-[#8C7F78] mx-1.5">→</span>
                      <span
                        className={
                          entry.newStatus === 'present' ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'
                        }
                      >
                        {entry.newStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-[14px] font-normal text-[#5C5552] max-w-xs">
                      {entry.reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
