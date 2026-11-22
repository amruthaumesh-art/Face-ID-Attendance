import React, { useState } from 'react';
import { LIVE_BACKEND } from '../services/liveApi';
import {
  BookOpenCheck,
  Camera,
  ClipboardCheck,
  FileClock,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from 'lucide-react';
import type { User } from '../types/attendance';
import { BrandMark } from './BrandMark';

export type ActivePage =
  | 'lecturer_dashboard'
  | 'capture_attendance'
  | 'attendance_review'
  | 'lecturer_classes'
  | 'admin_dashboard'
  | 'admin_puc1'
  | 'admin_puc2'
  | 'admin_faculty_classes'
  | 'admin_audit_log';

interface LayoutProps {
  user: User;
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  pageTitle: string;
  breadcrumb: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  children: React.ReactNode;
}

interface NavItem {
  id: ActivePage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Layout: React.FC<LayoutProps> = ({
  user,
  activePage,
  onNavigate,
  onLogout,
  pageTitle,
  breadcrumb,
  primaryAction,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const lecturerNav: NavItem[] = [
    { id: 'lecturer_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'capture_attendance', label: 'Capture Attendance', icon: Camera },
    { id: 'attendance_review', label: 'Attendance Review', icon: ClipboardCheck },
    { id: 'lecturer_classes', label: 'Assigned Classes', icon: GraduationCap },
  ];

  const adminNav: NavItem[] = [
    { id: 'admin_dashboard', label: 'Admin Dashboard', icon: Shield },
    { id: 'admin_puc1', label: '1st PUC Records', icon: Layers },
    { id: 'admin_puc2', label: '2nd PUC Records', icon: BookOpenCheck },
    { id: 'admin_faculty_classes', label: 'Lecturers & Classes', icon: Users },
    { id: 'attendance_review', label: 'Session Records', icon: ClipboardCheck },
    { id: 'admin_audit_log', label: 'Audit Logs', icon: FileClock },
  ];

  const navItems = user.role === 'admin' ? adminNav : lecturerNav;

  const handleSelectNav = (page: ActivePage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col lg:flex-row text-[#292929]">
      {/* Desktop Deep Maroon Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#681C2D] text-white border-r border-[#481321]">
        <div
          className="h-1 w-full bg-gradient-to-r from-[#481321] via-[#D6A84B] to-[#481321] shrink-0"
          aria-hidden="true"
        />

        {/* University Crest & Brand Header */}
        <div className="min-h-[76px] px-5 py-3 flex items-center gap-3 bg-[#481321] border-b border-white/10 shrink-0">
          <BrandMark variant="light" size="sm" />
          <div className="min-w-0">
            <div className="font-display text-[24px] font-bold tracking-tight text-white truncate leading-tight">
              FACE ID
            </div>
            <div className="text-[12px] font-normal text-[#D6A84B] truncate">
              1st &amp; 2nd PUC Attendance
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="px-5 pt-5 pb-2">
          <div className="text-[12px] font-medium uppercase tracking-wider text-[#D6A84B]/85">
            {user.role === 'admin' ? 'PUC Administration' : 'Lecturer Workspace'}
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-2 overflow-y-auto pb-4" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[15px] font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#D6A84B] text-[#292929] font-semibold shadow-sm'
                    : 'text-[#FAF7F0]/90 hover:bg-[#481321] hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#481321]' : 'text-[#D6A84B]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Footer Card */}
        <div className="p-4 border-t border-white/15 bg-[#481321] space-y-3">
          <div className="px-1">
            <div className="text-[14px] font-medium text-white truncate">{user.name}</div>
            <div className="text-[12px] font-normal text-[#D6A84B] truncate mt-0.5">
              {user.role === 'admin' ? 'Administrator' : user.title}
            </div>
            <div className="text-[12px] font-normal text-[#FAF7F0]/70 truncate mt-0.5">
              {user.department}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[14px] font-semibold text-[#FAF7F0] bg-[#681C2D] hover:bg-[#3A0E1A] border border-[#D6A84B]/35 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4 shrink-0 text-[#D6A84B]" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-Over Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#481321]/70 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#681C2D] text-white flex flex-col h-full shadow-2xl z-10">
            <div className="min-h-[72px] px-5 py-3 flex items-center justify-between border-b border-white/10 bg-[#481321]">
              <div className="flex items-center gap-2.5">
                <BrandMark variant="light" size="sm" />
                <div>
                  <span className="font-display font-bold text-[24px] leading-tight block">
                    FACE ID
                  </span>
                  <span className="text-[12px] font-normal text-[#D6A84B]">
                    1st &amp; 2nd PUC Attendance
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-[#FAF7F0] hover:text-white hover:bg-[#681C2D] min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-[15px] font-medium transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-[#D6A84B] text-[#292929] font-semibold'
                        : 'text-[#FAF7F0]/90 hover:bg-[#481321] hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#481321]' : 'text-[#D6A84B]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-white/15 space-y-3 bg-[#481321]">
              <div>
                <div className="text-[14px] font-medium text-white">{user.name}</div>
                <div className="text-[12px] font-normal text-[#FAF7F0]/80">
                  {user.role === 'admin' ? 'Administrator' : 'Lecturer'} · {user.email}
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[14px] font-semibold text-white bg-[#681C2D] hover:bg-[#3A0E1A] border border-[#D6A84B]/35 rounded-lg min-h-[44px]"
              >
                <LogOut className="w-4 h-4 text-[#D6A84B]" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Polished Dark Burgundy University Top Header */}
        <header className="sticky top-0 z-30 bg-[#481321] text-white border-b border-[#D6A84B]/35 shadow-sm">
          <div
            className="h-1 w-full bg-gradient-to-r from-[#681C2D] via-[#D6A84B] to-[#681C2D] lg:hidden"
            aria-hidden="true"
          />
          <div className="min-h-[76px] py-3 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-2 -ml-2 rounded-lg text-white hover:bg-[#681C2D] min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="lg:hidden shrink-0">
                <BrandMark variant="light" size="sm" />
              </div>

              <div className="min-w-0">
                <div className="text-[12px] font-medium text-[#D6A84B] truncate">
                  {breadcrumb}
                </div>
                <h1 className="font-display text-[26px] sm:text-[30px] font-bold text-white leading-tight truncate">
                  {pageTitle}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden md:block text-right pr-3 border-r border-white/15 last:border-r-0 last:pr-0">
                <div className="text-[14px] font-medium text-white">{user.name}</div>
                <div className="text-[12px] font-normal text-[#FAF7F0]/75">
                  {user.role === 'admin' ? 'PUC Administrator' : user.title}
                </div>
              </div>

              {primaryAction && (
                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  className="px-4 py-2 bg-[#D6A84B] hover:bg-[#C39538] text-[#292929] text-[14px] font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  {primaryAction.label}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="px-4 sm:px-6 lg:px-8 py-4 border-t border-[#E7DFCE] text-[12px] font-normal text-[#5C5552] max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>FACE ID · AI-Based Smart Classroom Attendance System (1st &amp; 2nd PUC)</span>
          <span>
            {LIVE_BACKEND
              ? 'Live: FastAPI + PostgreSQL · SCRFD detection + trained ArcFace (IResNet-50) · sample PUC classes are demo data'
              : 'Demo Mode (Sample Data) · Ready for FastAPI + PostgreSQL (SCRFD & ArcFace)'}
          </span>
        </footer>
      </div>
    </div>
  );
};
