import React, { useState } from 'react';
import {
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { DEMO_USERS, SAMPLE_ASSETS } from '../data/mockData';
import { loginUser } from '../services/api';
import type { User, UserRole } from '../types/attendance';
import { BrandMark } from './BrandMark';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<UserRole>('lecturer');
  const [email, setEmail] = useState<string>(DEMO_USERS.lecturer.email);
  const [password, setPassword] = useState<string>('College@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const handleRoleSwitch = (nextRole: UserRole) => {
    setRole(nextRole);
    setEmail(DEMO_USERS[nextRole].email);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await loginUser(email, password, role);
      onLoginSuccess(result.user);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col lg:flex-row text-[#292929]">
      {/* Left Institutional Showcase Panel */}
      <div className="relative lg:w-[52%] bg-[#681C2D] text-white flex flex-col justify-between overflow-hidden min-h-[270px] lg:min-h-screen">
        {!imgError && (
          <img
            src={SAMPLE_ASSETS.campusAtrium}
            alt="University Engineering Building Atrium"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#481321]/95 via-[#681C2D]/90 to-[#481321]/95"
          aria-hidden="true"
        />

        {/* Top University Brand Header */}
        <div className="relative z-10 px-6 pt-6 pb-4 sm:px-10 sm:pt-9 lg:px-12 lg:pt-11 flex items-center justify-between bg-[#481321]/60 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <BrandMark variant="light" size="lg" />
            <div>
              <div className="font-display text-[24px] font-bold tracking-tight text-white leading-tight">
                FACE ID
              </div>
              <div className="text-[12px] font-normal text-[#D6A84B] mt-0.5">
                AI-Based Smart Classroom Attendance · 1st &amp; 2nd PUC
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[12px] font-normal text-[#FAF7F0]/85 tabular-nums">
            <Building2 className="w-3.5 h-3.5 text-[#D6A84B]" />
            <span>PUC Academic Session 2026–27</span>
          </div>
        </div>

        {/* Center / Bottom Editorial Narrative */}
        <div className="relative z-10 px-6 py-8 sm:px-10 lg:px-12 lg:py-12 max-w-xl">
          <p className="text-[16px] font-medium text-[#D6A84B] tracking-wide mb-2.5">
            1st PUC &amp; 2nd PUC Faculty &amp; Administration Portal
          </p>
          <h1 className="font-display text-[30px] font-bold tracking-tight text-white leading-tight [text-wrap:balance]">
            Smart classroom attendance with verified faculty governance.
          </h1>
          <p className="mt-4 text-[14px] font-normal text-[#FAF7F0]/85 leading-relaxed max-w-lg">
            Manage 1st PUC and 2nd PUC lecture attendance, verify rear-row seating via targeted row uploads, and enforce institutional compliance through a locked one-hour review workflow.
          </p>

          <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <div className="text-[14px] font-semibold text-[#D6A84B]">95% Accuracy Gate</div>
              <div className="text-[12px] font-normal text-[#FAF7F0]/80 mt-1 leading-relaxed">
                Flags low-confidence matches and headcount discrepancies
              </div>
            </div>
            <div>
              <div className="text-[14px] font-semibold text-[#D6A84B]">60-Minute Window</div>
              <div className="text-[12px] font-normal text-[#FAF7F0]/80 mt-1 leading-relaxed">
                Time-bounded lecturer verification prior to record lock
              </div>
            </div>
            <div>
              <div className="text-[14px] font-semibold text-[#D6A84B]">1st &amp; 2nd PUC Split</div>
              <div className="text-[12px] font-normal text-[#FAF7F0]/80 mt-1 leading-relaxed">
                Dedicated rosters, subjects, reports, and audit logs
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 hidden lg:flex px-12 py-5 bg-[#481321]/75 border-t border-white/10 items-center justify-between text-[12px] font-normal text-[#FAF7F0]/75">
          <span>Pre-University Academic Computing &amp; Attendance Cell</span>
          <span>FastAPI + PostgreSQL · Sample Data Demo</span>
        </div>
      </div>

      {/* Right Authentication Panel */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-10 lg:p-14">
        <div className="w-full max-w-[440px] uni-card overflow-hidden">
          <div
            className="h-1.5 w-full bg-gradient-to-r from-[#481321] via-[#D6A84B] to-[#681C2D]"
            aria-hidden="true"
          />
          <div className="p-6 sm:p-8 lg:p-9">
            <div className="mb-7">
              <div className="flex items-center gap-2.5 lg:hidden mb-4">
                <BrandMark variant="dark" size="sm" />
                <span className="font-display font-bold text-[24px] text-[#292929] leading-tight">
                  FACE ID
                </span>
              </div>
              <h2 className="font-display text-[22px] font-semibold text-[#292929] tracking-tight">
                Portal Sign In
              </h2>
              <p className="mt-1.5 text-[14px] font-normal text-[#5C5552] leading-relaxed">
                Select your university role and enter your institutional credentials.
              </p>
            </div>

            {/* Role Selector Segmented Control */}
            <div
              className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF7F0] border border-[#E7DFCE] rounded-lg mb-6"
              role="tablist"
              aria-label="User role selection"
            >
              <button
                type="button"
                role="tab"
                aria-selected={role === 'lecturer'}
                onClick={() => handleRoleSwitch('lecturer')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-[14px] font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                  role === 'lecturer'
                    ? 'bg-[#681C2D] text-white shadow-xs'
                    : 'text-[#5C5552] hover:bg-[#481321]/10 hover:text-[#481321]'
                }`}
              >
                <UserCheck className={`w-4 h-4 shrink-0 ${role === 'lecturer' ? 'text-[#D6A84B]' : ''}`} />
                <span>Lecturer</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={role === 'admin'}
                onClick={() => handleRoleSwitch('admin')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-[14px] font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                  role === 'admin'
                    ? 'bg-[#681C2D] text-white shadow-xs'
                    : 'text-[#5C5552] hover:bg-[#481321]/10 hover:text-[#481321]'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 shrink-0 ${role === 'admin' ? 'text-[#D6A84B]' : ''}`} />
                <span>Admin</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[14px] font-medium text-[#292929] mb-1.5"
                >
                  University Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8C7F78] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="faculty@college.edu"
                    className="uni-input w-full pl-10 pr-3.5 py-2.5 text-[14px] min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-[14px] font-medium text-[#292929]"
                  >
                    Password
                  </label>
                  <span className="text-[12px] font-medium text-[#681C2D]">
                    Demo credentials loaded
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8C7F78] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="uni-input w-full pl-10 pr-11 py-2.5 text-[14px] min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-[#8C7F78] hover:text-[#292929] rounded-md"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 text-[12px] font-normal text-red-700 bg-red-50 border border-red-200 rounded-lg"
                >
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#D6A84B] hover:bg-[#C39538] disabled:opacity-60 text-[#292929] text-[14px] font-semibold rounded-lg shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#D6A84B] min-h-[44px]"
              >
                {isSubmitting
                  ? 'Authenticating...'
                  : role === 'lecturer'
                    ? 'Sign in to Lecturer Workspace'
                    : 'Sign in to Admin Console'}
              </button>
            </form>

            {/* Sample Profile Summary */}
            <div className="mt-6 p-4 bg-[#FAF7F0] border border-[#D6A84B]/45 rounded-lg space-y-1.5">
              <div className="text-[14px] font-semibold text-[#681C2D]">
                Selected Account ({role === 'lecturer' ? 'Faculty' : 'Administrator'})
              </div>
              <div className="text-[14px] font-medium text-[#292929]">
                {DEMO_USERS[role].name} · {DEMO_USERS[role].title}
              </div>
              <div className="text-[12px] font-normal text-[#5C5552] leading-relaxed">
                {DEMO_USERS[role].department}. Simulated workspace ready for FastAPI integration.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
