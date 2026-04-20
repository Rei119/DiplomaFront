'use client';

import { useState, useRef, useEffect } from 'react';
import { MATH_SYMBOLS, CHEMISTRY_SYMBOLS, PHYSICS_SYMBOLS } from '@/lib/data/scienceSymbols';

type Subject = 'math' | 'chemistry' | 'physics';

const SUBJECTS: { id: Subject; label: string; icon: string }[] = [
  { id: 'math',      label: 'Математик', icon: '∑' },
  { id: 'chemistry', label: 'Хими',      icon: '⚗' },
  { id: 'physics',   label: 'Физик',     icon: 'φ' },
];

const SYMBOL_MAP: Record<Subject, typeof MATH_SYMBOLS> = {
  math:      MATH_SYMBOLS,
  chemistry: CHEMISTRY_SYMBOLS,
  physics:   PHYSICS_SYMBOLS,
};

interface Props {
  /** Called with the LaTeX string to insert at cursor */
  onInsert: (latex: string) => void;
}

export default function ScienceInlinePicker({ onInsert }: Props) {
  const [open, setOpen]       = useState(false);
  const [subject, setSubject] = useState<Subject>('math');
  const panelRef              = useRef<HTMLDivElement>(null);
  const btnRef                = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleInsert = (latex: string) => {
    onInsert(latex);
    // keep panel open so teacher can insert multiple symbols
  };

  return (
    <div className="relative inline-block">
      {/* Trigger button */}
      <button
        type="button"
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        title="Шинжлэх ухааны тэмдэгтүүд"
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors ${
          open
            ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-100'
            : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
        }`}
      >
        <span className="text-sm leading-none">∑</span>
        <span>Тэмдэгт</span>
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-1.5 z-50 w-[460px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden"
        >
          {/* Subject tabs */}
          <div className="flex border-b border-neutral-100 dark:border-neutral-800">
            {SUBJECTS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSubject(s.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                  subject === s.id
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          {/* Symbols grid */}
          <div className="p-2 grid grid-cols-8 gap-1">
            {SYMBOL_MAP[subject].map((sym, i) => (
              <button
                key={i}
                type="button"
                title={sym.description}
                onClick={() => handleInsert(sym.latex)}
                className="relative group px-1 py-2 rounded-lg text-sm font-medium text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-900 dark:hover:bg-neutral-100 hover:text-white dark:hover:text-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 transition-colors"
              >
                {sym.label}
                {/* Tooltip */}
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[10px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow">
                  {sym.description}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-100" />
                </span>
              </button>
            ))}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
              Товчлуур дарж курсорт оруулна уу
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              Хаах
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
