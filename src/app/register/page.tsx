'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, User, Lock, Eye, EyeOff, ArrowRight, GraduationCap, ChevronLeft } from 'lucide-react';
import { authAPI } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import { LangToggle } from '@/lib/i18n/LanguageContext';
import { ThemeToggle } from '@/lib/theme/ThemeContext';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordStrength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const strengthLabel = ['', 'Сул', 'Дунд', 'Хүчтэй', 'Маш хүчтэй'];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-green-400', 'bg-green-500'];

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      // Redirect to Google OAuth — backend must have /auth/google endpoint
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      window.location.href = `${backendUrl}/auth/google?role=${role}`;
    } catch {
      setError('Google нэвтрэлт боломжгүй байна');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username.trim().length < 3) { setError('Нэвтрэх нэр хамгийн багадаа 3 тэмдэгт байх ёстой'); return; }
    if (password.length < 6) { setError('Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой'); return; }
    if (password !== confirmPassword) { setError('Нууц үг таарахгүй байна'); return; }
    setLoading(true);
    try {
      await authAPI.register(username.trim(), password, role);
      const loginRes = await authAPI.login(username.trim(), password);
      const { access_token, user } = loginRes.data;
      login(access_token, user);
      router.push(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail;
      if (typeof msg === 'string') setError(msg);
      else if (Array.isArray(msg)) setError(msg[0]?.msg || 'Бүртгэл амжилтгүй');
      else setError('Бүртгэл амжилтгүй. Нэвтрэх нэр давхардсан байж болно.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
      {/* Top right toggles */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-10">
        <LangToggle />
        <ThemeToggle />
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 text-center mb-1">Бүртгүүлэх</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-center text-sm mb-6">Шинэ бүртгэл үүсгэх</p>

        {/* Role toggle */}
        <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl mb-5">
          {(['student', 'teacher'] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                role === r
                  ? 'bg-white dark:bg-neutral-700 text-primary-700 dark:text-primary-400 shadow-sm border border-neutral-200 dark:border-neutral-600'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}>
              {r === 'student' ? <GraduationCap size={16} /> : <User size={16} />}
              {r === 'student' ? 'Оюутан' : 'Багш'}
            </button>
          ))}
        </div>

        {/* Google register button */}
        <button
          onClick={handleGoogleRegister}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold rounded-xl transition-all text-sm mb-4 disabled:opacity-60"
        >
          {googleLoading ? (
            <span className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Google-ээр бүртгүүлэх
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
          <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">эсвэл</span>
          <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Нэвтрэх нэр</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="input-field pl-10" placeholder="username" autoComplete="username" required />
            </div>
          </div>

          <div>
            <label className="label">Нууц үг</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="input-field pl-10 pr-11" placeholder="6+ тэмдэгт" autoComplete="new-password" required />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-1 flex-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength ? strengthColor[passwordStrength] : 'bg-neutral-200 dark:bg-neutral-700'}`} />
                  ))}
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{strengthLabel[passwordStrength]}</span>
              </div>
            )}
          </div>

          <div>
            <label className="label">Нууц үг давтах</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className={`input-field pl-10 pr-11 ${
                  confirmPassword && confirmPassword !== password ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20'
                  : confirmPassword && confirmPassword === password ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20'
                  : ''
                }`}
                placeholder="Нууц үгийг давтана уу" autoComplete="new-password" required />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all mt-2">
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><ArrowRight size={16} />Бүртгүүлэх</>}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Бүртгэлтэй юу? </span>
          <button onClick={() => router.push('/login')}
            className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors">
            Нэвтрэх
          </button>
        </div>
      </div>

      <button onClick={() => router.push('/')}
        className="mt-5 flex items-center gap-1.5 text-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
        <ChevronLeft size={14} />Нүүр хуудас руу буцах
      </button>
    </div>
  );
}