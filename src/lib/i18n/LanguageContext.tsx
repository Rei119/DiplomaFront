'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'mn' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  mn: {
    // Landing
    'landing.tagline': 'Багш оюутанд зориулсан',
    'landing.title1': 'Шалгалтыг',
    'landing.title2': 'авна',
    'landing.subtitle': 'Кодын шалгалт, AI хуурах илрүүлэлт, tab lock хяналт — бүгд нэг дор.',
    'landing.start': 'Эхлэх →',
    'landing.register': 'Бүртгүүлэх',
    'landing.login': 'Нэвтрэх',
    'landing.logout': 'Гарах',
    'landing.teacher': 'Багшийн хэсэг',
    'landing.student': 'Оюутны хэсэг',
    'landing.why': 'Яагаад энэ систем?',
    'landing.whyDesc': 'Одоогийн системүүдэд байхгүй 4 онцлог нэг дор',
    'landing.steps': '3 алхмаар шалгалт өгнө',
    'landing.stepsDesc': 'Хурдан, энгийн, найдвартай',

    // Features
    'feature.ai.title': 'AI Илрүүлэлт',
    'feature.ai.desc': 'Монгол + Англи хэлний гурван дамжлагат шинжилгээ',
    'feature.code.title': 'Код Ажиллуулалт',
    'feature.code.desc': 'Judge0 CE — Docker sandbox, 14+ хэл',
    'feature.tab.title': 'Tab Lock',
    'feature.tab.desc': 'Tab солих тоологдож хязгаараас хэтэрвэл автомат дуусна',
    'feature.pdf.title': 'PDF Скан',
    'feature.pdf.desc': 'Хуучин шалгалтыг PDF-ээс автоматаар үүсгэнэ',

    // Dashboard
    enterExam: 'Шалгалт өгөх',
    myResults: 'Миний үр дүн',
    results: 'Үр дүн',
    logout: 'Гарах',
    student: 'Оюутан',
    teacher: 'Багш',
    loading: 'Ачаалж байна...',
    search: 'Хайх',
    examCodeHint: '5 тэмдэгт код оруулна уу',
    examCodeLabel: 'Шалгалтын код',
    examFound: 'Шалгалт олдлоо',
    questions: 'Асуулт',
    minutes: 'Минут',
    passingScore: 'Давсан оноо',
    startExam: 'Шалгалт эхлэх',
    noResults: 'Үр дүн алга',
    noResultsHint: 'Та одоогоор шалгалт өгөөгүй байна',
    score: 'Оноо',
    passed: 'Тэнцсэн',
    failed: 'Унасан',
    pending: 'Хүлээгдэж байна',
    cheated: 'Зөрчилтэй',
    details: 'Дэлгэрэнгүй',

    // Common
    'common.copyright': '© 2026 Шалгалтын Систем',
  },

  en: {
    // Landing
    'landing.tagline': 'For Teachers and Students',
    'landing.title1': 'Take exams',
    'landing.title2': 'smartly',
    'landing.subtitle': 'Code testing, AI detection, tab lock control — all in one.',
    'landing.start': 'Get Started →',
    'landing.register': 'Register',
    'landing.login': 'Login',
    'landing.logout': 'Logout',
    'landing.teacher': 'Teacher Dashboard',
    'landing.student': 'Student Dashboard',
    'landing.why': 'Why this system?',
    'landing.whyDesc': '4 features not found in current systems',
    'landing.steps': 'Take exam in 3 steps',
    'landing.stepsDesc': 'Fast, simple, reliable',

    // Features
    'feature.ai.title': 'AI Detection',
    'feature.ai.desc': 'Mongolian + English three-stage analysis',
    'feature.code.title': 'Code Execution',
    'feature.code.desc': 'Judge0 CE — Docker sandbox, 14+ languages',
    'feature.tab.title': 'Tab Lock',
    'feature.tab.desc': 'Tab switches are counted and auto-fail on limit',
    'feature.pdf.title': 'PDF Scan',
    'feature.pdf.desc': 'Automatically create exams from PDF scans',

    // Dashboard
    enterExam: 'Enter Exam',
    myResults: 'My Results',
    results: 'Results',
    logout: 'Logout',
    student: 'Student',
    teacher: 'Teacher',
    loading: 'Loading...',
    search: 'Search',
    examCodeHint: 'Enter 5-character code',
    examCodeLabel: 'Exam Code',
    examFound: 'Exam Found',
    questions: 'Questions',
    minutes: 'Minutes',
    passingScore: 'Passing Score',
    startExam: 'Start Exam',
    noResults: 'No results yet',
    noResultsHint: 'You have not taken any exams',
    score: 'Score',
    passed: 'Passed',
    failed: 'Failed',
    pending: 'Pending',
    cheated: 'Cheated',
    details: 'Details',

    // Common
    'common.copyright': '© 2026 Exam System',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'mn',
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('mn');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language | null;
    if (saved === 'mn' || saved === 'en') {
      setLanguageState(saved);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['mn']] || key;
  };

  // ✅ CRITICAL FIX: prevent broken hydration + ensure proper reactivity
  if (!mounted) return null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

export function LangToggle() {
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-8 h-8" />;

  return (
    <button
      onClick={() => setLanguage(language === 'mn' ? 'en' : 'mn')}
      className="flex items-center justify-center w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-neutral-600 dark:text-neutral-400 text-xs font-semibold"
      title={language === 'mn' ? 'Switch to English' : 'Монгол руу шилжих'}
    >
      {language === 'mn' ? 'EN' : 'МН'}
    </button>
  );
}