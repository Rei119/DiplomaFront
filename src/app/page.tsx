'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

/* ── Logo ── */
function AppMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" style={{ width: size, height: size }}>
      <rect width="32" height="32" rx="8" fill="#557850" />
      <path d="M16 6L9 10v6c0 4 3 7.5 7 8.5 4-1 7-4.5 7-8.5v-6L16 6z" fill="white" opacity="0.15" />
      <path d="M11.5 16.5l3 3L20.5 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TwinklingStarsBackground({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: Array<{
      x: number;
      y: number;
      size: number;
      opacity: number;
      targetOpacity: number;
      fadeSpeed: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createStars();
    };

    const createStars = () => {
      stars = [];
      const starCount = Math.floor((canvas.width * canvas.height) / 3000);
      
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random(),
          targetOpacity: Math.random(),
          fadeSpeed: Math.random() * 0.02 + 0.005,
        });
      }
    };

    const animate = () => {
      // Background color based on theme
      ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Star color based on theme
      const starColor = isDark ? '85, 120, 80' : '85, 120, 80';

      stars.forEach((star) => {
        if (Math.abs(star.opacity - star.targetOpacity) < 0.01) {
          star.targetOpacity = Math.random();
        } else {
          if (star.opacity < star.targetOpacity) {
            star.opacity += star.fadeSpeed;
          } else {
            star.opacity -= star.fadeSpeed;
          }
        }

        star.opacity = Math.max(0, Math.min(1, star.opacity));

        if (star.opacity > 0.05) {
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 4
          );
          
          gradient.addColorStop(0, `rgba(${starColor}, ${star.opacity * 0.8})`);
          gradient.addColorStop(0.5, `rgba(${starColor}, ${star.opacity * 0.3})`);
          gradient.addColorStop(1, `rgba(${starColor}, 0)`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(${starColor}, ${star.opacity})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  
  return { ref, visible };
}

const WORDS = ['хялбараар', 'ухаалгаар'];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();

  // Language state
  const [lang, setLang] = useState<'mn' | 'en'>('mn');
  
  // Theme state
  const [isDark, setIsDark] = useState(true);

  // Typewriter animation
  const [wordIndex, setWordIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [cursor, setCursor] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = WORDS[wordIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting && typed === currentWord) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && typed === '') {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % WORDS.length);
      } else if (isDeleting) {
        setTyped(currentWord.substring(0, typed.length - 1));
      } else {
        setTyped(currentWord.substring(0, typed.length + 1));
      }
    }, isDeleting ? 50 : 100);
    return () => clearTimeout(timeout);
  }, [typed, isDeleting, wordIndex]);

  useEffect(() => {
    const b = setInterval(() => setCursor(c => !c), 500);
    return () => clearInterval(b);
  }, []);

  const handleDashboard = () => {
    if (isAuthenticated && user)
      router.push(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    else router.push('/login');
  };

  const feat = useReveal();
  const steps = useReveal();
  const roles = useReveal();

  // Translations
  const translations = {
    mn: {
      badge: 'Багш оюутанд зориулсан',
      title1: 'Шалгалтыг',
      title2: 'авъя',
      desc: 'Кодын шалгалт, AI хуурах илрүүлэлт, tab lock хяналт — бүгд нэг дор.',
      start: 'Эхлэх',
      register: 'Бүртгүүлэх',
      login: 'Нэвтрэх',
      logout: 'Гарах',
      teacher: 'Багшийн хэсэг',
      student: 'Оюутны хэсэг',
      features: [
        { title: 'AI Илрүүлэлт', desc: 'Монгол + Англи' },
        { title: 'Код Compiler', desc: 'Judge0 CE, 14+ хэл' },
        { title: 'Tab Lock', desc: 'Хяналт тоолдог' },
        { title: 'PDF Скан', desc: 'Асуулт үүсгэнэ' }
      ],
      stepsTitle: 'Хэрхэн ажилладаг вэ',
      steps: [
        { title: 'Код оруулах', desc: '5 тэмдэгтийн кодыг оруулна' },
        { title: 'Мэдээлэл', desc: 'ID болон мэргэжлээ оруулна' },
        { title: 'Шалгалт', desc: 'Хяналттай орчинд өгнө' }
      ],
      teacherLabel: 'Багш',
      teacherTitle: 'Шалгалт үүсгэх, хянах',
      teacherItems: ['PDF-ээс асуулт', 'Код үүсгэх', 'Хариу шалгах', 'AI тайлан'],
      teacherBtn: 'Багшаар бүртгүүлэх',
      studentLabel: 'Оюутан',
      studentTitle: 'Шалгалт өгөх, үр дүн харах',
      studentItems: ['Кодоор орох', 'Код бичих', 'Үр дүн харах', 'Feedback авах'],
      studentBtn: 'Шалгалтад орох',
      techTitle: 'Технологи'
    },
    en: {
      badge: 'For teachers & students',
      title1: 'Take exams',
      title2: 'smarter',
      desc: 'Code exams, AI detection, tab lock monitoring — all in one place.',
      start: 'Get Started',
      register: 'Sign Up',
      login: 'Login',
      logout: 'Logout',
      teacher: 'Teacher Dashboard',
      student: 'Student Dashboard',
      features: [
        { title: 'AI Detection', desc: 'Mongolian + English' },
        { title: 'Code Compiler', desc: 'Judge0 CE, 14+ languages' },
        { title: 'Tab Lock', desc: 'Monitors switches' },
        { title: 'PDF Scanner', desc: 'Generate questions' }
      ],
      stepsTitle: 'How it works',
      steps: [
        { title: 'Enter Code', desc: 'Enter 5-digit exam code' },
        { title: 'Information', desc: 'Enter your ID and major' },
        { title: 'Take Exam', desc: 'In monitored environment' }
      ],
      teacherLabel: 'Teacher',
      teacherTitle: 'Create & manage exams',
      teacherItems: ['Import from PDF', 'Generate code', 'Grade answers', 'AI reports'],
      teacherBtn: 'Sign up as teacher',
      studentLabel: 'Student',
      studentTitle: 'Take exams & view results',
      studentItems: ['Join with code', 'Write code', 'View results', 'Get feedback'],
      studentBtn: 'Take an exam',
      techTitle: 'Technology'
    }
  };

  const t = translations[lang];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <TwinklingStarsBackground isDark={isDark} />

      <div className="relative z-10">
        {/* Nav */}
        <nav className={`border-b backdrop-blur-sm ${
          isDark 
            ? 'border-neutral-800 bg-neutral-900/50' 
            : 'border-neutral-200 bg-white/80'
        }`}>
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <button onClick={() => router.push('/')} className="flex items-center gap-2.5">
              <AppMark size={26} />
              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                Шалгалтын Систем
              </span>
            </button>

            <div className="flex items-center gap-2">
              {isAuthenticated && user ? (
                <>
                  <span className={`text-sm hidden md:block ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {user.username}
                  </span>
                  <button onClick={handleDashboard} className="px-4 py-2 bg-[#557850] hover:bg-[#68905f] text-white text-sm font-semibold rounded-lg transition-colors">
                    {user.role === 'teacher' ? t.teacher : t.student}
                  </button>
                  <button onClick={() => { logout(); window.location.reload(); }} 
                    className={`px-3 py-2 text-sm transition-colors ${
                      isDark 
                        ? 'text-neutral-400 hover:text-neutral-200' 
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}>
                    {t.logout}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => router.push('/login')} 
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      isDark
                        ? 'text-neutral-300 hover:text-white'
                        : 'text-neutral-700 hover:text-neutral-900'
                    }`}>
                    {t.login}
                  </button>
                  <button onClick={() => router.push('/register')} className="px-4 py-2 bg-[#557850] hover:bg-[#68905f] text-white text-sm font-semibold rounded-lg transition-colors">
                    {t.register}
                  </button>
                </>
              )}
              
              <div className={`w-px h-4 mx-1 ${isDark ? 'bg-neutral-700' : 'bg-neutral-300'}`} />
              
              {/* Language Toggle */}
              <button
                onClick={() => setLang(lang === 'mn' ? 'en' : 'mn')}
                className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                }`}
              >
                {lang === 'mn' ? 'EN' : 'MN'}
              </button>
              
              {/* Theme Toggle */}
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700'
                    : 'bg-neutral-100 hover:bg-neutral-200'
                }`}
              >
                {isDark ? (
                  <svg className="w-4 h-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
          <div className="max-w-4xl w-full text-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8 ${
              isDark
                ? 'bg-[#557850]/20 border border-[#557850]/40 text-[#7ba572]'
                : 'bg-[#557850]/10 border border-[#557850]/30 text-[#557850]'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#557850] animate-pulse" />
              {t.badge}
            </div>

            <h1 className={`text-5xl md:text-6xl font-bold leading-tight mb-6 ${
              isDark ? 'text-white' : 'text-neutral-900'
            }`}>
              {t.title1}{' '}
              <span 
                className="text-[#7ba572]"
                style={{
                  textShadow: '0 0 30px rgba(85, 120, 80, 0.6), 0 0 60px rgba(85, 120, 80, 0.3)',
                  filter: 'brightness(1.2)'
                }}
              >
                {typed}
                <span
                  className="inline-block w-[3px] h-[0.85em] bg-[#557850] ml-1 align-middle"
                  style={{ 
                    opacity: cursor ? 1 : 0,
                    boxShadow: '0 0 15px rgba(85, 120, 80, 0.8)'
                  }}
                />
              </span>
              <br />
              {t.title2}
            </h1>

            <p className={`text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto ${
              isDark ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              {t.desc}
            </p>

            <div className="flex gap-4 justify-center flex-wrap">
              <button onClick={handleDashboard} className="px-8 py-3 bg-[#557850] hover:bg-[#68905f] text-white font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-[#557850]/30">
                {t.start} →
              </button>
              <button onClick={() => router.push('/register')} 
                className={`px-8 py-3 font-semibold rounded-lg text-sm transition-colors ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200'
                    : 'bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700'
                }`}>
                {t.register}
              </button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 pb-20" ref={feat.ref}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {t.features.map(({ title, desc }, i) => (
              <div
                key={i}
                className={`border rounded-xl p-6 hover:border-[#557850]/50 transition-all duration-500 backdrop-blur-sm ${
                  feat.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                } ${
                  isDark
                    ? 'bg-neutral-900/50 border-neutral-800 hover:bg-neutral-900/70'
                    : 'bg-white/70 border-neutral-200 hover:bg-white'
                }`}
                style={{ transitionDelay: `${i * 75}ms` }}
              >
                <span className="text-3xl font-mono block mb-3 text-[#7ba572]">
                  {['◈', '◉', '◎', '◐'][i]}
                </span>
                <h3 className={`font-bold text-sm mb-1 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  {title}
                </h3>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className={`border-t backdrop-blur-sm ${
          isDark
            ? 'border-neutral-800 bg-neutral-900/30'
            : 'border-neutral-200 bg-neutral-50/50'
        }`}>
          <div ref={steps.ref} className="max-w-6xl mx-auto px-6 py-16">
            <p className={`text-xs font-semibold uppercase tracking-wider mb-8 text-center ${
              isDark ? 'text-neutral-500' : 'text-neutral-600'
            }`}>
              {t.stepsTitle}
            </p>
            <div className="grid sm:grid-cols-3 gap-8">
              {t.steps.map(({ title, desc }, i) => (
                <div key={i} className={`flex gap-4 transition-all duration-500 ${steps.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`} 
                  style={{ transitionDelay: `${i * 100}ms` }}>
                  <div className="shrink-0 w-10 h-10 rounded-full bg-[#557850] text-white text-sm font-bold flex items-center justify-center">
                    {`0${i + 1}`}
                  </div>
                  <div>
                    <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      {title}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roles */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div ref={roles.ref} className="grid md:grid-cols-2 gap-4">
            <div className={`backdrop-blur-sm border rounded-xl p-6 transition-all duration-500 delay-75 ${
              roles.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            } ${
              isDark
                ? 'bg-neutral-900/50 border-neutral-800'
                : 'bg-white/70 border-neutral-200'
            }`}>
              <p className="text-xs font-semibold text-[#7ba572] uppercase tracking-wider mb-3">
                {t.teacherLabel}
              </p>
              <h3 className={`font-bold text-lg mb-3 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                {t.teacherTitle}
              </h3>
              <ul className="space-y-2 mb-5">
                {t.teacherItems.map((item, i) => (
                  <li key={i} className={`flex items-center gap-2 text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    <span className="w-1 h-1 rounded-full bg-[#557850] shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <button onClick={() => router.push('/register')} className="w-full px-4 py-2 bg-[#557850] hover:bg-[#68905f] text-white text-xs font-semibold rounded-lg transition-colors">
                {t.teacherBtn}
              </button>
            </div>

            <div className={`backdrop-blur-sm border rounded-xl p-6 transition-all duration-500 delay-150 ${
              roles.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            } ${
              isDark
                ? 'bg-neutral-900/50 border-neutral-800'
                : 'bg-white/70 border-neutral-200'
            }`}>
              <p className="text-xs font-semibold text-sky-500 uppercase tracking-wider mb-3">
                {t.studentLabel}
              </p>
              <h3 className={`font-bold text-lg mb-3 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                {t.studentTitle}
              </h3>
              <ul className="space-y-2 mb-5">
                {t.studentItems.map((item, i) => (
                  <li key={i} className={`flex items-center gap-2 text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    <span className="w-1 h-1 rounded-full bg-sky-500 shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <button onClick={() => router.push('/login')} 
                className={`w-full px-4 py-2 border text-xs font-semibold rounded-lg transition-colors ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
                    : 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-700'
                }`}>
                {t.studentBtn}
              </button>
            </div>
          </div>
        </section>

        {/* Tech */}
        <section className={`border-t backdrop-blur-sm ${
          isDark
            ? 'border-neutral-800 bg-neutral-900/30'
            : 'border-neutral-200 bg-neutral-50/50'
        }`}>
          <div className="max-w-6xl mx-auto px-6 py-10">
            <p className={`text-xs font-semibold uppercase tracking-wider mb-4 text-center ${
              isDark ? 'text-neutral-500' : 'text-neutral-600'
            }`}>
              {t.techTitle}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Next.js 15', 'FastAPI', 'PostgreSQL', 'Claude API', 'Judge0 CE', 'JWT'].map(tech => (
                <span key={tech} className={`px-3 py-1.5 border text-xs font-mono rounded-md ${
                  isDark
                    ? 'bg-neutral-900/50 border-neutral-800 text-neutral-400'
                    : 'bg-white border-neutral-200 text-neutral-600'
                }`}>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={`border-t backdrop-blur-sm ${
          isDark
            ? 'border-neutral-800 bg-neutral-900/30'
            : 'border-neutral-200 bg-white/80'
        }`}>
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AppMark size={18} />
              <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                © 2026 Шалгалтын Систем
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLang(lang === 'mn' ? 'en' : 'mn')}
                className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                }`}
              >
                {lang === 'mn' ? 'EN' : 'MN'}
              </button>
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700'
                    : 'bg-neutral-100 hover:bg-neutral-200'
                }`}
              >
                {isDark ? (
                  <svg className="w-4 h-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}