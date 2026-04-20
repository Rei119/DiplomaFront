'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Moon, Sun, Globe, ChevronDown } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!mounted) return <div className="w-9 h-9" />;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-neutral-600 dark:text-neutral-400"
        title="Settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 py-2 z-50">
          
          {/* Theme Section */}
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
              {language === 'mn' ? 'Харагдах горим' : 'Appearance'}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  if (theme === 'dark') toggleTheme();
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  theme === 'light'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                {language === 'mn' ? 'Цайвар' : 'Light'}
              </button>
              <button
                onClick={() => {
                  if (theme === 'light') toggleTheme();
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  theme === 'dark'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                {language === 'mn' ? 'Харанхуй' : 'Dark'}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-2" />

          {/* Language Section */}
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
              {language === 'mn' ? 'Хэл' : 'Language'}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setLanguage('mn')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  language === 'mn'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Монгол
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  language === 'en'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                English
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}