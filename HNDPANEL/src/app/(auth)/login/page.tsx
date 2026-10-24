'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  Stethoscope,
  ShieldCheck,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Activity,
  Leaf,
  Layers,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'hospital_admin'>('doctor');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const handleRoleToggle = (role: 'doctor' | 'hospital_admin') => {
    setSelectedRole(role);
    setEmail('');
    setPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both Staff Email and Password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login({ email: email.trim(), password });
      if (user.role === 'hospital_admin') {
        router.push('/admin/doctors');
      } else {
        router.push('/doctor');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials or inactive account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[url('/KioskScreenBg.png')] bg-center bg-cover bg-no-repeat bg-[#f1f8f7] flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-y-auto">
      {/* Subtle Frosted Background Overlay */}
      <div className="absolute inset-0 bg-white/45 backdrop-blur-[2px] pointer-events-none" />

      {/* Centered 2-Column Responsive Split Container */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-stretch justify-center gap-6 lg:gap-8 z-10 my-auto">
        
        {/* ============================================================ */}
        {/* LEFT / SIDE PANEL: P2Care Demo & Quick-Fill Card         */}
        {/* ============================================================ */}
        <aside className="w-full md:w-[380px] lg:w-[420px] bg-white/95 md:bg-emerald-50/60 backdrop-blur-md border border-emerald-200/90 rounded-3xl shadow-xl p-6 sm:p-7 flex flex-col justify-between text-slate-800 transition-all">
          <div>
            {/* P2Care Header Banner */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-800 text-teal-200 flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-extrabold text-teal-950 uppercase tracking-wider">
                    P2Care Demo Desk
                  </h2>
                  <p className="text-[10px] text-teal-700 font-semibold">
                    Instant Evaluator Quick-Access
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold bg-teal-600 text-white rounded-full uppercase tracking-wider shadow-2xs">
                Demo
              </span>
            </div>

            {/* Pitch & Highlights Description */}
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Test the end-to-end clinical workflow: AI SOCRATES intake, Ayush Dosha assessment, real-time ABDM privacy locks, and instant e-prescription builder.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2 mb-5 text-[11px] font-medium text-slate-700">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/80 border border-teal-100 shadow-2xs">
                <Stethoscope className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Doctor OPD Desk</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/80 border border-teal-100 shadow-2xs">
                <Leaf className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>AYUSH Profiling</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/80 border border-teal-100 shadow-2xs">
                <Activity className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Vitals Telemetry</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/80 border border-teal-100 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>ABDM EHR Stack</span>
              </div>
            </div>

            {/* Active Credentials Box - Doctor */}
            <div className="bg-white p-3.5 rounded-2xl border border-teal-200/90 shadow-2xs space-y-1.5 mb-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900">
                  Doctor Evaluation Account
                </span>
                <span className="text-[9px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                  Clinician
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium text-[11px]">Email:</span>
                  <span className="font-mono font-bold text-slate-800 select-all text-[11px]">
                    Use your assigned staff email
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium text-[11px]">Password:</span>
                  <span className="font-mono font-bold text-slate-800 select-all text-[11px]">
                    Use your assigned password
                  </span>
                </div>
              </div>
            </div>

            {/* Active Credentials Box - Admin */}
            <div className="bg-white p-3.5 rounded-2xl border border-teal-200/90 shadow-2xs space-y-1.5 mb-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900">
                  Hospital Admin Account
                </span>
                <span className="text-[9px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                  Admin Portal
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium text-[11px]">Email:</span>
                  <span className="font-mono font-bold text-slate-800 select-all text-[11px]">
                    Use your assigned staff email
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium text-[11px]">Password:</span>
                  <span className="font-mono font-bold text-slate-800 select-all text-[11px]">
                    Use your assigned password
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="pt-1 text-center text-xs font-medium text-slate-600">
            Use the staff credentials issued by your hospital administrator.
          </p>
        </aside>

        {/* ============================================================ */}
        {/* RIGHT / MAIN PANEL: Login Form Card                          */}
        {/* ============================================================ */}
        <main className="w-full md:flex-1 max-w-md bg-white/98 border border-slate-200/90 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 flex flex-col justify-between">
          <div>
            {/* Brand Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 flex items-center justify-center mb-2">
                <img
                  src="/ayushCareLogo.png"
                  alt="P2Care Logo"
                  className="w-14 h-14 object-contain"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="text-[#12383b]">P2</span>
                <span className="text-[#438b34]">Care</span>
              </h1>
              <p className="text-xs font-semibold text-slate-500 tracking-wide mt-1">
                Patient to Care. Without Delay.
              </p>
              <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-[11px] font-semibold text-teal-800">
                <img src="/ayushman-bharat-icon.png" alt="Ayushman Bharat" className="w-4 h-4 object-contain" />
                <span>Ayushman Bharat Digital Mission</span>
              </div>
            </div>

            {/* Role Segment Toggle */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-5 border border-slate-200">
              <button
                type="button"
                onClick={() => handleRoleToggle('doctor')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'doctor'
                    ? 'bg-[#064e4b] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>Doctor Console</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleToggle('hospital_admin')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'hospital_admin'
                    ? 'bg-[#064e4b] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Hospital Admin</span>
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Staff Email / User Identifier
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="staff@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-800 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-800 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-0.5 rounded focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 bg-[#064e4b] hover:bg-[#043b39] text-white font-bold py-3 px-4 rounded-xl text-sm shadow-sm hover:shadow flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Demo Credentials — Quick Fill */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Demo Credentials — Click to Auto-fill
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => { setEmail('admin@ayushcare.com'); setPassword('Admin@123'); setSelectedRole('hospital_admin'); }}
                className="flex items-center justify-between w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-amber-100 hover:border-amber-300 transition-all cursor-pointer active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                  <span>Hospital Admin</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">admin@ayushcare.com</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('dr.rajesh.sharma@ayushcare.com'); setPassword('Doctor@123'); setSelectedRole('doctor'); }}
                className="flex items-center justify-between w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-amber-100 hover:border-amber-300 transition-all cursor-pointer active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                  <span>Dr. Rajesh Sharma</span>
                </span>
                <span className="text-[10px] text-slate-400">General Medicine</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('dr.ananya.sen@ayushcare.com'); setPassword('Doctor@123'); setSelectedRole('doctor'); }}
                className="flex items-center justify-between w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-amber-100 hover:border-amber-300 transition-all cursor-pointer active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5 text-red-500" />
                  <span>Dr. Ananya Sen</span>
                </span>
                <span className="text-[10px] text-slate-400">Cardiology</span>
              </button>
            </div>
          </div>

          {/* Footer info */}
          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-200 pt-3">
            Secured by ABDM Health Stack & Government EHR Protocols
          </div>
        </main>
      </div>
    </div>
  );
}
