'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { examsAPI, submissionsAPI } from '@/lib/api/client';
import { useLanguage, LangToggle } from '@/lib/i18n/LanguageContext';
import { ThemeToggle } from '@/lib/theme/ThemeContext';
import type { Exam, Submission } from '@/types';

function IconEnter({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px] flex-shrink-0">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} opacity={active ? 0.1 : 1}/>
      <path d="M7 10h6M10 7l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

export default function StudentDashboardPage() {
  const [activeTab, setActiveTab] = useState<'enter' | 'results'>('enter');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submittedExams, setSubmittedExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [foundExam, setFoundExam] = useState<Exam | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'student') router.push('/login');
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'student') loadData();
  }, [isAuthenticated, user]);

  // Poll every 15 seconds when on the results tab
  useEffect(() => {
    if (activeTab !== 'results') return;
    const interval = setInterval(() => loadData(true), 15_000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // silent=true skips the full-screen spinner (used for background polls)
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const submissionsRes = await submissionsAPI.getAll();
      const subs: Submission[] = submissionsRes.data || [];
      setSubmissions(subs);

      const examIds = [...new Set(subs.map(s => s.exam_id))];
      const examResults = await Promise.allSettled(
        examIds.map(id => examsAPI.getById(id))
      );
      setSubmittedExams(
        examResults
          .filter(r => r.status === 'fulfilled')
          .map((r: any) => r.value.data)
      );
      setLastUpdated(new Date());
    } catch {
      setSubmissions([]); setSubmittedExams([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (code.length !== 5) { setSearchError(t('examCodeHint')); return; }
    setSearching(true); setSearchError(''); setFoundExam(null);
    try {
      const res = await examsAPI.getByCode(code);
      setFoundExam(res.data);
    } catch (err: any) {
      setSearchError(err.response?.data?.detail || t('examCodeHint'));
    } finally { setSearching(false); }
  };

  if (!isAuthenticated || user?.role !== 'student') return null;

  const SidebarContent = () => (
    <>
      <div className="px-4 py-5 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <AppMark size={30} />
          <div>
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-none">{t('exams')}</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{t('student')}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary-700 dark:text-primary-400">{user?.username?.charAt(0)?.toUpperCase() ?? '?'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{user?.username}</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{t('student')}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <p className="px-3 py-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-wider">{t('student')}</p>

        <button onClick={() => { setActiveTab('enter'); setSidebarOpen(false); }}
          className={`nav-item ${activeTab === 'enter' ? 'nav-item-active' : ''}`}>
          <IconEnter active={activeTab === 'enter'} />
          <span>{t('enterExam')}</span>
        </button>

        <button onClick={() => { setActiveTab('results'); setSidebarOpen(false); }}
          className={`nav-item ${activeTab === 'results' ? 'nav-item-active' : ''}`}>
          <IconResults active={activeTab === 'results'} />
          <span>{t('myResults')}</span>
          {submissions.length > 0 && (
            <span className="ml-auto text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded-md">{submissions.length}</span>
          )}
        </button>

        <button onClick={() => { router.push('/profile'); setSidebarOpen(false); }}
          className="nav-item">
          <IconProfile />
          <span>Профайл</span>
        </button>
      </nav>

      <div className="px-2 py-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
        <div className="px-1 pb-1 flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
        <button onClick={() => { logout(); router.push('/'); }}
          className="nav-item text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
          <IconLogout />
          <span>{t('logout')}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-stone-50 dark:bg-neutral-950 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-8 py-4 flex-shrink-0 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            <IconMenu />
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {activeTab === 'enter' ? t('enterExam') : t('myResults')}
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="spinner w-7 h-7 mb-3" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
            </div>
          ) : activeTab === 'enter' ? (
            <div className="max-w-md w-full">
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8">
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">{t('examCodeLabel')}</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{t('examCodeHint')}</p>
                <input type="text" value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5)); setSearchError(''); setFoundExam(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="A1B2C" maxLength={5} autoFocus
                  className={`w-full text-center text-2xl font-mono font-bold tracking-[0.4em] px-4 py-4 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase transition-all
                    bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                    ${searchError ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20'
                    : foundExam ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-950/20'
                    : 'border-neutral-200 dark:border-neutral-700'}`} />
                {searchError && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{searchError}</p>}
                <button onClick={handleSearch} disabled={code.length !== 5 || searching}
                  className="w-full mt-3 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                  {searching ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('search')}
                </button>
              </div>

              {foundExam && (
                <div className="mt-3 bg-white dark:bg-neutral-900 rounded-xl border-2 border-primary-200 dark:border-primary-800 overflow-hidden">
                  <div className="px-5 py-3 bg-primary-50 dark:bg-primary-950/30 border-b border-primary-100 dark:border-primary-900">
                    <span className="text-sm font-semibold text-primary-700 dark:text-primary-400">{t('examFound')}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-neutral-900 dark:text-neutral-100 mb-3">{foundExam.title}</h3>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { value: foundExam.questions?.length || 0, label: t('questions') },
                        { value: (foundExam as any).time_limit, label: t('minutes') },
                        { value: `${foundExam.passing_score}%`, label: t('passingScore') },
                      ].map(({ value, label }) => (
                        <div key={label} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => router.push(`/student/exam/${foundExam.id}`)}
                      className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg text-sm transition-colors">
                      {t('startExam')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // ── Results Tab ──────────────────────────────────────────────────
            <div className="space-y-3 max-w-2xl w-full">

              {/* Live update indicator */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                  Үр дүн автоматаар шинэчлэгдэнэ
                </p>
                {lastUpdated && (
                  <p className="text-xs text-neutral-300 dark:text-neutral-600">
                    {lastUpdated.toLocaleTimeString('mn-MN')}
                  </p>
                )}
              </div>

              {submissions.length === 0 ? (
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-12 text-center">
                  <p className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{t('noResults')}</p>
                  <p className="text-sm text-neutral-400 dark:text-neutral-500">{t('noResultsHint')}</p>
                </div>
              ) : submissions.map(sub => {
                const exam = submittedExams.find(e => e.id === sub.exam_id);
                const score = sub.total_score ?? null;
                const passed = score !== null && score >= (exam?.passing_score || 70);
                const isFailed = sub.status === 'failed';

                return (
                  <div key={sub.id} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 p-4 sm:p-5 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1 truncate">
                          {exam?.title || t('exams')}
                        </h3>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">
                          {new Date(sub.created_at).toLocaleString('mn-MN')}
                        </p>

                        {/* Student ID number + major if present */}
                        {(sub.student_id_number || sub.student_major) && (
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">
                            {[sub.student_id_number, sub.student_major].filter(Boolean).join(' · ')}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-neutral-500 dark:text-neutral-400">{t('score')}:</span>
                          <span className={`font-bold ${
                            isFailed ? 'text-red-600 dark:text-red-400'
                            : passed ? 'text-primary-600 dark:text-primary-400'
                            : score !== null ? 'text-red-600 dark:text-red-400'
                            : 'text-neutral-400'
                          }`}>
                            {score !== null ? `${score.toFixed(1)}%` : '—'}
                          </span>
                          {score === null && (
                            <span className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse inline-block" />
                              Хүлээгдэж байна
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`badge text-xs ${
                          isFailed ? 'badge-danger'
                          : passed ? 'badge-success'
                          : score !== null ? 'badge-danger'
                          : 'badge-neutral'
                        }`}>
                          {isFailed ? t('cheated') : passed ? t('passed') : score !== null ? t('failed') : t('pending')}
                        </span>
                        <button onClick={() => router.push(`/student/results/${sub.id}`)}
                          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700">
                          {t('details')} →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}