'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { authAPI } from '@/lib/api/client';
import { LangToggle, useLanguage } from '@/lib/i18n/LanguageContext';
import { ThemeToggle } from '@/lib/theme/ThemeContext';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { login } = useAuthStore();
  const { language } = useLanguage();

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
    window.location.href = `${backendUrl}/api/auth/google?role=${role}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.login(username, password);
      const { access_token, user } = response.data;
      login(user, access_token);
      router.push(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail === 'not_registered') {
        setError(language === 'mn' ? 'Бүртгэлгүй хаяг байна' : 'Please register');
      } else {
        setError('Нэвтрэх амжилтгүй');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-neutral-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col bg-primary-700 text-white p-12 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center border border-white/30">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-white/90 text-sm tracking-wide">Шалгалтын Систем</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl font-bold leading-tight mb-4">Мэдлэгийг<br />үнэлэх орчин</h1>
            <p className="text-white/70 text-lg leading-relaxed mb-12">
              Багш болон оюутанд зориулсан орчин үеийн шалгалтын платформ
            </p>
            <div className="space-y-4">
              {[
                { icon: '◈', text: 'AI хуурах илрүүлэлт' },
                { icon: '◉', text: 'Бодит код ажиллуулалт' },
                { icon: '◎', text: 'Tab lock хяналт' },
                { icon: '◐', text: 'PDF скан дамжуулан шалгалт үүсгэх' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-white/80">
                  <span className="text-white/40 text-lg font-mono w-5">{icon}</span>
                  <span className="text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-8">
            <LangToggle />
            <ThemeToggle />
          </div>
          <p className="text-white/30 text-xs mt-4">© 2026 Шалгалтын Систем</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile header */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">Шалгалтын Систем</span>
            </div>
            <div className="flex items-center gap-2">
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">Нэвтрэх</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">Бүртгэлтэй хэрэглэгч нэвтэрнэ үү</p>

          {/* Role selector */}
          <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg mb-5">
            {(['student', 'teacher'] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                  role === r
                    ? 'bg-white dark:bg-neutral-700 text-primary-700 dark:text-primary-400 shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}>
                {r === 'student' ? 'Оюутан' : 'Багш'}
              </button>
            ))}
          </div>

          {/* Google login */}
          <button onClick={handleGoogleLogin} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold rounded-lg transition-all text-sm mb-4 disabled:opacity-60">
            {googleLoading
              ? <span className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
              : <GoogleIcon />}
            Google-ээр нэвтрэх
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
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="input-field" placeholder={role === 'teacher' ? 'teacher1' : 'student1'}
                autoComplete="username" required />
            </div>

            <div>
              <label className="label">Нууц үг</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10" placeholder="••••••••"
                  autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                  <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                    {showPassword ? (
                      <path d="M3.98 8.223A10.477 10.477 0 001.934 10C3.226 13.338 6.413 15.75 10 15.75c.993 0 1.953-.138 2.863-.395M6.228 6.228A3 3 0 0113 10a3 3 0 01-.93 2.18m-1.07 1.07A3 3 0 017 10c0-.891.387-1.692 1-2.244M3 3l14 14"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    ) : (
                      <>
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M2.045 10C3.356 5.943 6.414 3.5 10 3.5c3.586 0 6.644 2.443 7.955 6.5-1.311 4.057-4.369 6.5-7.955 6.5-3.586 0-6.644-2.443-7.955-6.5z"
                          stroke="currentColor" strokeWidth="1.5"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                </svg>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 mt-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Нэвтрэх'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 font-medium">Туршилтын бүртгэл</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Багш', value: 'teacher1 / password123' },
                { label: 'Оюутан', value: 'student1 / password123' },
              ].map(({ label, value }) => (
                <div key={label} className="p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                  <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">{label}</p>
                  <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Бүртгэлгүй юу?{' '}
            <button onClick={() => router.push('/register')}
              className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors">
              Бүртгүүлэх
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}