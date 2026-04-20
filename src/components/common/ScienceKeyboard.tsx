// src/components/common/ScienceKeyboard.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Calculator, Atom, X, ChevronDown, ChevronUp, Beaker, FlaskConical } from 'lucide-react';
import {
  KeyboardType,
  getSymbolsByType,
  FORMULA_TEMPLATES,
} from '@/lib/data/scienceSymbols';

interface ScienceKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const TABS: { id: KeyboardType; label: string; icon: React.ReactNode }[] = [
  { id: 'math',      label: 'Математик', icon: <Calculator size={14} /> },
  { id: 'chemistry', label: 'Хими',      icon: <FlaskConical size={14} /> },
  { id: 'physics',   label: 'Физик',     icon: <Atom size={14} /> },
];

export default function ScienceKeyboard({
  value,
  onChange,
  placeholder = 'Асуулт бичих...',
  className = '',
}: ScienceKeyboardProps) {
  const [isOpen, setIsOpen]         = useState(false);
  const [tab, setTab]               = useState<KeyboardType>('math');
  const [showTemplates, setShowTemplates] = useState(false);
  const cursorRef = useRef(0);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Track cursor position
  const saveCursor = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    cursorRef.current = e.currentTarget.selectionStart ?? value.length;
  };

  const insertText = (text: string) => {
    const pos    = cursorRef.current;
    const before = value.slice(0, pos);
    const after  = value.slice(pos);
    const newVal = before + text + after;
    onChange(newVal);

    // Restore cursor after the inserted text
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const next = pos + text.length;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(next, next);
      cursorRef.current = next;
    });
  };

  const symbols   = getSymbolsByType(tab);
  const templates = FORMULA_TEMPLATES[tab];

  return (
    <div className={`flex flex-col gap-0 ${className}`}>

      {/* ── Textarea ── */}
      <textarea
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onClick={saveCursor}
        onKeyUp={saveCursor}
        onSelect={saveCursor}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-t-lg bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono leading-relaxed"
      />

      {/* ── Toolbar strip ── */}
      <div className="flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-700 border border-t-0 border-neutral-300 dark:border-neutral-600 rounded-b-lg">
        <button
          type="button"
          onClick={() => { setIsOpen(o => !o); setShowTemplates(false); }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
            isOpen
              ? 'bg-primary-600 text-white'
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
          }`}
          title="Тэмдэгтийн гар"
        >
          <Calculator size={13} />
          Тэмдэгт
        </button>

        <button
          type="button"
          onClick={() => { setShowTemplates(t => !t); setIsOpen(false); }}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            showTemplates
              ? 'bg-primary-600 text-white'
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
          }`}
        >
          Загварууд
          {showTemplates ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        <div className="flex-1" />

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            title="Цэвэрлэх"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Symbol keyboard panel ── */}
      {isOpen && (
        <div className="mt-1 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 shadow-sm overflow-hidden">

          {/* Tab row */}
          <div className="flex border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-primary-600 text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Symbol grid — no max-height, no scroll */}
          <div className="p-2 grid grid-cols-7 sm:grid-cols-10 gap-1">
            {symbols.map((sym, i) => (
              <button
                key={i}
                type="button"
                onClick={() => insertText(sym.latex)}
                title={sym.description}
                className="h-9 flex items-center justify-center rounded border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 hover:bg-primary-100 dark:hover:bg-primary-900/40 hover:border-primary-400 dark:hover:border-primary-600 text-sm font-medium text-neutral-800 dark:text-neutral-200 transition-colors select-none"
              >
                {sym.label}
              </button>
            ))}
          </div>

          {/* Hint */}
          <div className="px-3 py-1.5 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
              Тэмдэгтийг дарахад курсорын байрлалд оруулна
            </p>
          </div>
        </div>
      )}

      {/* ── Formula templates panel ── */}
      {showTemplates && (
        <div className="mt-1 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 shadow-sm overflow-hidden">
          <div className="flex border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-primary-600 text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-2 flex flex-col gap-1">
            {templates.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  insertText((value && !value.endsWith('\n') ? ' ' : '') + tpl.latex);
                  setShowTemplates(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg border border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-200 dark:hover:border-primary-700 transition-colors"
              >
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block mb-0.5">
                  {tpl.label}
                </span>
                <span className="text-sm font-mono text-neutral-900 dark:text-neutral-100">
                  {tpl.latex}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
