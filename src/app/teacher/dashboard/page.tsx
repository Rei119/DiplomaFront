'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { examsAPI, submissionsAPI } from '@/lib/api/client';
import { ExamBuilder } from '@/components/teacher/ExamBuilder';
import ResultsView from '@/components/teacher/ResultsView';
import { useLanguage, LangToggle } from '@/lib/i18n/LanguageContext';
import { ThemeToggle } from '@/lib/theme/ThemeContext';
import type { Exam, Submission } from '@/types';

function IconExams({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px] flex-shrink-0">
      <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'} opacity={active ? 0.15 : 1}/>
      <path d="M12 2v4a1 1 0 001 1h3M8 11h4M8 14h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconResults({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px] flex-shrink-0">
      <path d="M3 10h3v7H3v-7zM8.5 6h3v11h-3V6zM14 3h3v14h-3V3z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1}/>
    </svg>
  );
}

function IconProfile({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px] flex-shrink-0">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} opacity={active ? 0.15 : 1}/>
      <path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" 
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px] flex-shrink-0">
      <path d="M13 8V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2v-2M16 10H8m5-3l3 3-3 3"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function AppMark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" style={{ width: size, height: size }}>
      <rect width="32" height="32" rx="8" fill="#557850"/>
      <path d="M16 6L9 10v6c0 4 3 7.5 7 8.5 4-1 7-4.5 7-8.5v-6L16 6z" fill="white" opacity="0.15"/>
      <path d="M11.5 16.5l3 3L20.5 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<'exams' | 'results'>('exams');
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { user, logout, isAuthenticated } = useAuthStore();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'teacher') {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [examsRes, submissionsRes] = await Promise.all([
        examsAPI.getAll(), submissionsAPI.getAll(),
      ]);
      setExams(examsRes.data || []);
      setSubmissions(submissionsRes.data || []);
    } catch {
      setExams([]); setSubmissions([]);
    } finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); router.push('/'); };

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-4 py-5 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <AppMark size={30} />
          <div>
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-none">{t('exams')}</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{t('teacher')}</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary-700 dark:text-primary-400">{user?.username?.charAt(0)?.toUpperCase() ?? '?'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{user?.username}</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{t('teacher')}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-wider">{t('teacher')}</p>
        
        <button onClick={() => { setActiveTab('exams'); setSidebarOpen(false); }}
          className={`nav-item ${activeTab === 'exams' ? 'nav-item-active' : ''}`}>
          <IconExams active={activeTab === 'exams'} />
          <span>{t('exams')}</span>
          {exams.length > 0 && <span className="ml-auto text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded-md">{exams.length}</span>}
        </button>

        <button onClick={() => { setActiveTab('results'); setSidebarOpen(false); }}
          className={`nav-item ${activeTab === 'results' ? 'nav-item-active' : ''}`}>
          <IconResults active={activeTab === 'results'} />
          <span>{t('results')}</span>
          {submissions.length > 0 && <span className="ml-auto text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded-md">{submissions.length}</span>}
        </button>

        <button onClick={() => { router.push('/teacher/live'); setSidebarOpen(false); }}
          className="nav-item">
          <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px] flex-shrink-0">
            <circle cx="10" cy="10" r="2.5" fill="currentColor" />
            <circle cx="10" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
          </svg>
          <span>Шууд хяналт</span>
        </button>

        {/* NEW: Profile Button */}
        <button onClick={() => { router.push('/profile'); setSidebarOpen(false); }}
          className="nav-item">
          <IconProfile />
          <span>Профайл</span>
        </button>
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
        <div className="px-1 pb-1 flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
        <button onClick={handleLogout} className="nav-item text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
          <IconLogout />
          <span>{t('logout')}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-stone-50 dark:bg-neutral-950 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — hidden on mobile, slide in when open */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        w-64 lg:w-56 flex-shrink-0
        bg-white dark:bg-neutral-900
        border-r border-neutral-200 dark:border-neutral-800
        flex flex-col h-screen
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-8 py-4 flex-shrink-0 flex items-center gap-3">
          {/* Mobile menu button */}
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            <IconMenu />
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {activeTab === 'exams' ? t('exams') : t('results')}
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="spinner w-7 h-7 mb-3" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
            </div>
          ) : (
            <>
              {activeTab === 'exams' && <ExamBuilder onExamCreated={loadData} />}
              {activeTab === 'results' && <ResultsView submissions={submissions} exams={exams} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}