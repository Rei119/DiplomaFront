'use client';

/**
 * TeacherCodeViewer.tsx
 * Location: src/components/teacher/TeacherCodeViewer.tsx
 * 
 * Read-only code viewer for teachers to review student submissions.
 * Features:
 * - Syntax-highlighted code display
 * - Run code to verify output
 * - See execution results
 * - View compile errors
 * - Manual scoring interface
 */

import { useState, useCallback } from 'react';
import {
  Play, CheckCircle, XCircle, Clock, Cpu, AlertCircle, 
  Loader2, Terminal, ChevronRight, Code2
} from 'lucide-react';

export const COMPILER_LANGUAGES = [
  { id: 71, name: 'Python 3',    ext: 'py',   color: '#3b82f6' },
  { id: 63, name: 'JavaScript',  ext: 'js',   color: '#eab308' },
  { id: 74, name: 'TypeScript',  ext: 'ts',   color: '#60a5fa' },
  { id: 62, name: 'Java',        ext: 'java', color: '#f97316' },
  { id: 54, name: 'C++',         ext: 'cpp',  color: '#a855f7' },
  { id: 50, name: 'C',           ext: 'c',    color: '#6366f1' },
  { id: 51, name: 'C#',          ext: 'cs',   color: '#8b5cf6' },
  { id: 68, name: 'PHP',         ext: 'php',  color: '#818cf8' },
  { id: 83, name: 'Swift',       ext: 'swift',color: '#f97316' },
  { id: 78, name: 'Kotlin',      ext: 'kt',   color: '#a78bfa' },
  { id: 60, name: 'Go',          ext: 'go',   color: '#22d3ee' },
  { id: 80, name: 'R',           ext: 'r',    color: '#2563eb' },
  { id: 73, name: 'Rust',        ext: 'rs',   color: '#fb923c' },
  { id: 72, name: 'Ruby',        ext: 'rb',   color: '#ef4444' },
  { id: 0,  name: 'HTML/CSS/JS', ext: 'html', color: '#f43f5e' },
] as const;

interface RunResult {
  stdout: string;
  stderr: string;
  compileOutput: string;
  statusId: number;
  statusLabel: string;
  time: string;
  memoryKb: number;
}

interface TeacherCodeViewerProps {
  code: string;
  languageId: number;
  studentName?: string;
  questionTitle?: string;
  maxPoints?: number;
  currentScore?: number;
  onScoreChange?: (score: number) => void;
  showGrading?: boolean;
}

const toB64 = (str: string) => btoa(unescape(encodeURIComponent(str)));
const fromB64 = (b64: string | null | undefined): string => {
  if (!b64) return '';
  try { return decodeURIComponent(escape(atob(b64))); } catch { return b64; }
};

const STATUS: Record<number, { label: string; type: 'success' | 'error' | 'warning' | 'info' }> = {
  1:  { label: 'Дараалалд', type: 'info' },
  2:  { label: 'Боловсруулж байна', type: 'info' },
  3:  { label: 'Амжилттай', type: 'success' },
  6:  { label: 'Компиляцийн алдаа', type: 'error' },
  7:  { label: 'Runtime алдаа', type: 'error' },
};

export default function TeacherCodeViewer({
  code,
  languageId,
  studentName,
  questionTitle,
  maxPoints = 10,
  currentScore = 0,
  onScoreChange,
  showGrading = true,
}: TeacherCodeViewerProps) {
  const JUDGE0_URL = 'https://ce.judge0.com';
  
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [stdin, setStdin] = useState('');
  const [activeTab, setActiveTab] = useState<'output' | 'stderr' | 'compile'>('output');
  const [manualScore, setManualScore] = useState(currentScore);

  const language = COMPILER_LANGUAGES.find(l => l.id === languageId) ?? COMPILER_LANGUAGES[0];
  const lines = code.split('\n');

  const runCode = async () => {
    setRunning(true);
    setResult(null);
    setApiError(null);

    try {
      const submitRes = await fetch(
        `${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_code: toB64(code),
            language_id: languageId,
            stdin: stdin ? toB64(stdin) : undefined,
            cpu_time_limit: 5,
            memory_limit: 128 * 1024,
            base64_encoded: true,
          }),
        }
      );

      if (!submitRes.ok) {
        const d = await submitRes.json().catch(() => ({}));
        throw new Error(d?.message ?? `Илгээлт амжилтгүй (${submitRes.status})`);
      }

      const { token } = await submitRes.json();
      if (!token) throw new Error('Токен хүлээж авсангүй');

      for (let attempt = 0; attempt < 25; attempt++) {
        await new Promise(r => setTimeout(r, 700 + attempt * 80));

        const pollRes = await fetch(
          `${JUDGE0_URL}/submissions/${token}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time,memory`
        );
        if (!pollRes.ok) throw new Error(`Үр дүн авахад алдаа (${pollRes.status})`);

        const d = await pollRes.json();
        if ((d.status?.id ?? 0) <= 2) continue;

        const run: RunResult = {
          stdout: fromB64(d.stdout),
          stderr: fromB64(d.stderr),
          compileOutput: fromB64(d.compile_output),
          statusId: d.status?.id ?? 0,
          statusLabel: d.status?.description ?? '',
          time: d.time ?? '0',
          memoryKb: d.memory ?? 0,
        };

        setResult(run);
        if (run.statusId === 6) setActiveTab('compile');
        else if (run.statusId > 6) setActiveTab('stderr');
        else setActiveTab('output');
        return;
      }

      throw new Error('Хариу хүлээх хугацаа хэтэрлээ');
    } catch (err: any) {
      setApiError(err.message ?? 'Тодорхойгүй алдаа');
    } finally {
      setRunning(false);
    }
  };

  const handleScoreChange = (score: number) => {
    const validScore = Math.max(0, Math.min(maxPoints, score));
    setManualScore(validScore);
    onScoreChange?.(validScore);
  };

  const statusInfo = result ? (STATUS[result.statusId] ?? { label: result.statusLabel, type: 'info' }) : null;
  const isSuccess = result?.statusId === 3;

  const statusColor = statusInfo
    ? statusInfo.type === 'success' ? 'text-emerald-500'
    : statusInfo.type === 'error' ? 'text-red-500'
    : 'text-neutral-500'
    : '';

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      
      {/* Header */}
      <div className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              {questionTitle && (
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{questionTitle}</h3>
              )}
              {studentName && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Оюутан: {studentName}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <span className="w-2 h-2 rounded-full" style={{ background: language.color }} />
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{language.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Code Display */}
      <div className="flex">
        {/* Line numbers */}
        <div className="bg-neutral-100 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 px-3 py-4 flex-shrink-0">
          {lines.map((_, i) => (
            <div key={i} className="h-6 text-right text-xs text-neutral-400 dark:text-neutral-600 leading-6 font-mono">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code content */}
        <div className="flex-1 bg-neutral-50 dark:bg-neutral-950 px-4 py-4 overflow-x-auto">
          <pre className="text-xs leading-6 font-mono text-neutral-900 dark:text-neutral-100">
            {code}
          </pre>
        </div>
      </div>

      {/* Test Panel */}
      <div className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="bg-neutral-50 dark:bg-neutral-900 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Код шалгах</span>
            <button
              onClick={runCode}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              {running ? (
                <><Loader2 size={12} className="animate-spin" />Ажиллаж байна</>
              ) : (
                <><Play size={12} />Ажиллуулах</>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4">
          {/* Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Оролт (stdin)
            </label>
            <textarea
              value={stdin}
              onChange={e => setStdin(e.target.value)}
              placeholder="5&#10;10"
              className="w-full h-24 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-mono text-neutral-900 dark:text-neutral-100 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Гаралт
              </label>
              {result && statusInfo && (
                <div className={`flex items-center gap-1.5 ${statusColor}`}>
                  {isSuccess ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  <span className="text-xs font-semibold">{statusInfo.label}</span>
                </div>
              )}
            </div>
            
            <div className="h-24 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg overflow-auto">
              {running && (
                <div className="flex items-center justify-center h-full text-neutral-500">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}

              {apiError && !running && (
                <pre className="text-xs text-red-400 whitespace-pre-wrap font-mono">{apiError}</pre>
              )}

              {!running && !apiError && !result && (
                <div className="flex flex-col items-center justify-center h-full text-neutral-600">
                  <Terminal size={16} />
                  <span className="text-xs mt-1">Кодыг ажиллуулна уу</span>
                </div>
              )}

              {!running && result && (
                <div>
                  {/* Tabs */}
                  <div className="flex gap-2 mb-2 border-b border-neutral-800 pb-1">
                    {(['output', 'stderr', 'compile'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`text-xs px-2 py-0.5 rounded transition-colors ${
                          activeTab === tab
                            ? 'text-emerald-400 bg-emerald-900/30'
                            : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        {tab === 'output' ? 'Гаралт' : tab === 'stderr' ? 'Stderr' : 'Compile'}
                      </button>
                    ))}
                  </div>

                  {/* Performance stats */}
                  <div className="flex gap-3 mb-2 text-neutral-500">
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span className="text-xs">{result.time}с</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Cpu size={10} />
                      <span className="text-xs">
                        {result.memoryKb ? `${(result.memoryKb / 1024).toFixed(1)} МБ` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Output content */}
                  <pre className={`text-xs whitespace-pre-wrap font-mono ${
                    activeTab === 'output' ? 'text-emerald-400' :
                    activeTab === 'stderr' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {activeTab === 'output' && (result.stdout || <span className="text-neutral-600 italic">Гаралт байхгүй</span>)}
                    {activeTab === 'stderr' && (result.stderr || <span className="text-neutral-600 italic">Stderr байхгүй</span>)}
                    {activeTab === 'compile' && (result.compileOutput || <span className="text-neutral-600 italic">Компиляцийн гаралт байхгүй</span>)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Grading Section */}
      {showGrading && (
        <div className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Оноо
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={maxPoints}
                value={manualScore}
                onChange={e => handleScoreChange(Number(e.target.value))}
                className="w-20 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-semibold text-neutral-900 dark:text-neutral-100 text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-500 dark:text-neutral-400">/ {maxPoints}</span>
              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                manualScore === maxPoints
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : manualScore >= maxPoints * 0.5
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {Math.round((manualScore / maxPoints) * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}