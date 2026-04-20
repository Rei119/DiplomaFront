'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Play, RotateCcw, Copy, Check, Terminal,
  Clock, Cpu, AlertCircle, CheckCircle, Loader2, Settings2,
  X, FileCode, FolderOpen, Plus,
  Maximize2, Minimize2, Globe, RefreshCw,
} from 'lucide-react';

export const COMPILER_LANGUAGES = [
  { id: 71, name: 'Python 3',    ext: 'py',   color: '#3b82f6', starter: '# Python 3\nprint("Hello, World!")\n' },
  { id: 63, name: 'JavaScript',  ext: 'js',   color: '#eab308', starter: '// JavaScript\nconsole.log("Hello, World!");\n' },
  { id: 74, name: 'TypeScript',  ext: 'ts',   color: '#60a5fa', starter: '// TypeScript\nconst message: string = "Hello, World!";\nconsole.log(message);\n' },
  { id: 62, name: 'Java',        ext: 'java', color: '#f97316', starter: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n' },
  { id: 54, name: 'C++',         ext: 'cpp',  color: '#a855f7', starter: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n' },
  { id: 50, name: 'C',           ext: 'c',    color: '#6366f1', starter: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n' },
  { id: 51, name: 'C#',          ext: 'cs',   color: '#8b5cf6', starter: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}\n' },
  { id: 68, name: 'PHP',         ext: 'php',  color: '#818cf8', starter: '<?php\necho "Hello, World!\\n";\n?>\n' },
  { id: 83, name: 'Swift',       ext: 'swift',color: '#f97316', starter: 'import Swift\n\nprint("Hello, World!")\n' },
  { id: 78, name: 'Kotlin',      ext: 'kt',   color: '#a78bfa', starter: 'fun main() {\n    println("Hello, World!")\n}\n' },
  { id: 60, name: 'Go',          ext: 'go',   color: '#22d3ee', starter: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n' },
  { id: 80, name: 'R',           ext: 'r',    color: '#2563eb', starter: 'cat("Hello, World!\\n")\n' },
  { id: 73, name: 'Rust',        ext: 'rs',   color: '#fb923c', starter: 'fn main() {\n    println!("Hello, World!");\n}\n' },
  { id: 72, name: 'Ruby',        ext: 'rb',   color: '#ef4444', starter: 'puts "Hello, World!"\n' },
  { id: 0,  name: 'HTML/CSS/JS', ext: 'html', color: '#f43f5e', starter: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Page</title>\n  <style>\n    body {\n      font-family: sans-serif;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      height: 100vh;\n      margin: 0;\n      background: #1a1a2e;\n      color: #eee;\n    }\n    h1 { color: #e94560; }\n  </style>\n</head>\n<body>\n  <div>\n    <h1>Hello, World!</h1>\n    <p>Edit this HTML to build your page.</p>\n  </div>\n  <script>\n    console.log("Page loaded!");\n  </script>\n</body>\n</html>\n' },
] as const;

export type CompilerLanguage = typeof COMPILER_LANGUAGES[number];

const STATUS: Record<number, { label: string; type: 'success' | 'error' | 'warning' | 'info' }> = {
  1: { label: 'Дараалалд байна',    type: 'info' },
  2: { label: 'Боловсруулж байна',  type: 'info' },
  3: { label: 'Амжилттай',          type: 'success' },
  6: { label: 'Компиляцийн алдаа',  type: 'error' },
  7: { label: 'Runtime алдаа',      type: 'error' },
};

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  languageId?: number;
}

interface RunResult {
  stdout: string;
  stderr: string;
  compileOutput: string;
  statusId: number;
  statusLabel: string;
  time: string;
  memoryKb: number;
}

interface CodeCompilerProps {
  initialCode?: string;
  initialLanguageId?: number;
  onCodeChange?: (code: string, ranOk: boolean) => void;
  examMode?: boolean;
}

const toB64 = (str: string) => btoa(unescape(encodeURIComponent(str)));
const fromB64 = (b64: string | null | undefined): string => {
  if (!b64) return '';
  try { return decodeURIComponent(escape(atob(b64))); } catch { return b64; }
};

export default function CodeCompiler({
  initialCode,
  initialLanguageId = 71,
  onCodeChange,
  examMode = false,
}: CodeCompilerProps) {
  const JUDGE0_URL = 'https://ce.judge0.com';
  const initLang = COMPILER_LANGUAGES.find(l => l.id === initialLanguageId) ?? COMPILER_LANGUAGES[0];

  const [files, setFiles] = useState<FileNode[]>([
    {
      id: 'main',
      name: `main.${initLang.ext}`,
      type: 'file',
      content: initialCode || initLang.starter,
      languageId: initLang.id,
    },
  ]);
  const [activeFileId, setActiveFileId] = useState('main');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [stdin, setStdin] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'output' | 'stderr' | 'compile'>('output');
  const [timeLimit, setTimeLimit] = useState(5);
  const [memLimit, setMemLimit] = useState(128);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Web preview state
  const [webPreviewSrc, setWebPreviewSrc] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const ranOkRef = useRef(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeFile = files.find(f => f.id === activeFileId);
  const currentLang = COMPILER_LANGUAGES.find(l => l.id === activeFile?.languageId) ?? initLang;
  const isWebMode = currentLang.id === 0;

  // Auto-preview on code change in web mode
  useEffect(() => {
    if (isWebMode && activeFile?.content) {
      setWebPreviewSrc(activeFile.content);
    }
  }, [isWebMode, activeFile?.content]);

  const updateFileContent = useCallback(
    (fileId: string, content: string) => {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content } : f));
      if (fileId === activeFileId) {
        onCodeChange?.(content, ranOkRef.current);
      }
    },
    [activeFileId, onCodeChange],
  );

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (activeFile) updateFileContent(activeFile.id, e.target.value);
    },
    [activeFile, updateFileContent],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      if (!activeFile) return;
      const el = e.currentTarget;
      const s = el.selectionStart;
      const end = el.selectionEnd;
      const next = (activeFile.content || '').slice(0, s) + '  ' + (activeFile.content || '').slice(end);
      updateFileContent(activeFile.id, next);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2; });
    },
    [activeFile, updateFileContent],
  );

  const addNewFile = () => {
    const num = files.filter(f => f.name.startsWith('untitled')).length + 1;
    const newFile: FileNode = {
      id: `file-${Date.now()}`,
      name: `untitled${num}.${currentLang.ext}`,
      type: 'file',
      content: currentLang.starter,
      languageId: currentLang.id,
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  };

  const deleteFile = (fileId: string) => {
    if (files.length === 1) { alert('Хамгийн багадаа 1 файл байх ёстой'); return; }
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFileId === fileId) {
      const remaining = files.filter(f => f.id !== fileId);
      setActiveFileId(remaining[0]?.id || '');
    }
  };

  const runWebPreview = () => {
    if (activeFile?.content) {
      setWebPreviewSrc(activeFile.content);
      ranOkRef.current = true;
      onCodeChange?.(activeFile.content, true);
    }
  };

  const runCode = async () => {
    if (isWebMode) { runWebPreview(); return; }
    if (!activeFile?.content) return;
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
            source_code: toB64(activeFile.content),
            language_id: currentLang.id,
            stdin: stdin ? toB64(stdin) : undefined,
            cpu_time_limit: timeLimit,
            memory_limit: memLimit * 1024,
            base64_encoded: true,
          }),
        },
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
          `${JUDGE0_URL}/submissions/${token}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time,memory`,
        );
        if (!pollRes.ok) throw new Error(`Үр дүн авахад алдаа (${pollRes.status})`);

        const d = await pollRes.json();
        if ((d.status?.id ?? 0) <= 2) continue;

        const run: RunResult = {
          stdout:        fromB64(d.stdout),
          stderr:        fromB64(d.stderr),
          compileOutput: fromB64(d.compile_output),
          statusId:      d.status?.id ?? 0,
          statusLabel:   d.status?.description ?? '',
          time:          d.time ?? '0',
          memoryKb:      d.memory ?? 0,
        };

        setResult(run);

        if (run.statusId === 6) setActiveTab('compile');
        else if (run.statusId > 6) setActiveTab('stderr');
        else setActiveTab('output');

        const success = run.statusId === 3;
        if (success) ranOkRef.current = true;
        onCodeChange?.(activeFile.content, ranOkRef.current);
        return;
      }

      throw new Error('Хариу хүлээх хугацаа хэтэрлээ');
    } catch (err: any) {
      setApiError(err.message ?? 'Тодорхойгүй алдаа');
    } finally {
      setRunning(false);
    }
  };

  const copyCode = async () => {
    if (activeFile?.content) {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetCode = () => {
    if (activeFile) {
      ranOkRef.current = false;
      updateFileContent(activeFile.id, currentLang.starter);
      setResult(null);
      setApiError(null);
      setWebPreviewSrc(null);
    }
  };

  const statusInfo = result ? (STATUS[result.statusId] ?? { label: result.statusLabel, type: 'info' }) : null;
  const isSuccess = result?.statusId === 3;
  const lines = (activeFile?.content || '').split('\n');

  const statusColor = statusInfo
    ? statusInfo.type === 'success' ? 'text-emerald-400'
    : statusInfo.type === 'error'   ? 'text-red-400'
    : statusInfo.type === 'warning' ? 'text-amber-400'
    : 'text-neutral-400'
    : '';

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-neutral-950'
    : examMode
    ? 'h-[700px]'
    : 'h-[780px]';

  return (
    <div className={`${containerClass} flex flex-col bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 font-mono text-sm shadow-2xl`}>

      {/* Top toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex-shrink-0">
        {/* Language badge */}
        <div className="flex items-center gap-2 mr-1">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: currentLang.color, boxShadow: `0 0 6px ${currentLang.color}88` }}
          />
          <span className="text-xs font-bold text-neutral-200">{currentLang.name}</span>
        </div>

        <div className="w-px h-4 bg-neutral-700 mx-1" />
        <span className="text-xs text-neutral-600 font-medium">IDE</span>

        <div className="flex-1" />

        {/* Settings (hidden in web mode) */}
        {!isWebMode && (
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setSettingsOpen(v => !v)}
              className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
              title="Тохиргоо"
            >
              <Settings2 size={14} />
            </button>
            {settingsOpen && (
              <div className="absolute top-full right-0 mt-1 w-60 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl z-50 p-4">
                <p className="text-xs font-bold text-neutral-400 uppercase mb-3">Тохиргоо</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs text-neutral-400">Цагийн хязгаар</label>
                      <span className="text-xs font-bold text-primary-400">{timeLimit}с</span>
                    </div>
                    <input type="range" min={1} max={15} value={timeLimit}
                      onChange={e => setTimeLimit(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full accent-primary-500 cursor-pointer" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs text-neutral-400">Санах ой</label>
                      <span className="text-xs font-bold text-primary-400">{memLimit} МБ</span>
                    </div>
                    <input type="range" min={32} max={512} step={32} value={memLimit}
                      onChange={e => setMemLimit(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full accent-primary-500 cursor-pointer" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={copyCode} title="Код хуулах" className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors">
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
        <button onClick={resetCode} title="Дахилт" className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors">
          <RotateCcw size={14} />
        </button>
        <button onClick={() => setIsFullscreen(p => !p)} title="Дэлгэц дүүргэх" className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors">
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>

        <div className="w-px h-4 bg-neutral-700 mx-1" />

        <button
          onClick={runCode}
          disabled={running}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
            isWebMode
              ? 'bg-orange-600 hover:bg-orange-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {running
            ? <><Loader2 size={13} className="animate-spin" />Ажиллаж байна</>
            : isWebMode
            ? <><RefreshCw size={13} />Шинэчлэх</>
            : <><Play size={13} />Ажиллуулах</>}
        </button>
      </div>

      {/* Main IDE area */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar — collapsible file tree */}
        {sidebarOpen && (
          <div className="w-44 bg-neutral-900/60 border-r border-neutral-800 flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
              <div className="flex items-center gap-1.5">
                <FolderOpen size={13} className="text-amber-500" />
                <span className="text-xs font-semibold text-neutral-300">Файлууд</span>
              </div>
              <button
                onClick={addNewFile}
                className="p-1 text-neutral-600 hover:text-emerald-400 hover:bg-neutral-800 rounded transition-colors"
                title="Шинэ файл"
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-1.5">
              {files.map(file => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                    activeFileId === file.id
                      ? 'bg-primary-900/30 text-primary-400'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                  }`}
                  onClick={() => setActiveFileId(file.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileCode size={12} className="flex-shrink-0" />
                    <span className="text-xs truncate">{file.name}</span>
                  </div>
                  {files.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteFile(file.id); }}
                      className="p-0.5 text-neutral-600 hover:text-red-400 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Collapse toggle */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-center py-2 text-neutral-700 hover:text-neutral-400 hover:bg-neutral-800 text-xs border-t border-neutral-800 transition-colors"
            >
              ‹ Хаах
            </button>
          </div>
        )}

        {/* Sidebar open tab (when collapsed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-7 flex-shrink-0 flex items-center justify-center bg-neutral-900/60 border-r border-neutral-800 text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
            title="Файл нээх"
          >
            <span className="text-xs" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>› Файлууд</span>
          </button>
        )}

        {/* Editor + output split */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* File tabs */}
          <div className="flex items-center gap-1 px-2 py-1.5 bg-neutral-900/40 border-b border-neutral-800 flex-shrink-0 overflow-x-auto">
            {files.map(file => {
              const fileLang = COMPILER_LANGUAGES.find(l => l.id === file.languageId);
              return (
                <button
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    activeFileId === file.id
                      ? 'bg-neutral-800 text-neutral-100 border border-neutral-700'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: fileLang?.color ?? '#888' }}
                  />
                  {file.name}
                </button>
              );
            })}
          </div>

          {/* Code editor + right panel */}
          <div className="flex flex-1 min-h-0">

            {/* Code editor (takes ~60% of space) */}
            <div className="flex flex-1 min-w-0 border-r border-neutral-800" style={{ minWidth: 0 }}>
              <div className="flex w-full min-h-0">
                {/* Line numbers */}
                <div className="w-12 bg-neutral-950 border-r border-neutral-800/60 flex-shrink-0 overflow-hidden pt-3 pb-3 select-none">
                  {lines.map((_, i) => (
                    <div key={i} className="h-6 flex items-center justify-end pr-3 text-neutral-700 text-xs leading-6">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  ref={taRef}
                  value={activeFile?.content || ''}
                  onChange={handleCodeChange}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  className="flex-1 bg-neutral-950 text-neutral-100 text-xs leading-6 px-4 py-3 resize-none outline-none overflow-auto caret-emerald-400 selection:bg-emerald-900/40 select-text"
                  style={{ tabSize: 2, fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}
                />
              </div>
            </div>

            {/* Right panel — output or web preview */}
            <div className="flex flex-col flex-shrink-0" style={{ width: '42%', minWidth: 280 }}>

              {isWebMode ? (
                /* ── Web preview panel ──────────────────────────── */
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900/60 border-b border-neutral-800 flex-shrink-0">
                    <Globe size={13} className="text-orange-400" />
                    <span className="text-xs font-semibold text-orange-400">Вэб харагдац</span>
                    <div className="flex-1" />
                    <button
                      onClick={runWebPreview}
                      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-200 transition-colors"
                      title="Шинэчлэх"
                    >
                      <RefreshCw size={11} />
                      <span>Шинэчлэх</span>
                    </button>
                  </div>

                  <div className="flex-1 bg-white relative">
                    {webPreviewSrc ? (
                      <iframe
                        ref={iframeRef}
                        srcDoc={webPreviewSrc}
                        title="Web Preview"
                        sandbox="allow-scripts"
                        className="w-full h-full border-0"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-3 bg-neutral-950">
                        <Globe size={32} className="text-neutral-700" />
                        <p className="text-xs text-neutral-600 text-center px-4">
                          "Шинэчлэх" дарахад таны HTML/CSS/JS энд харагдана
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── Terminal output panel ──────────────────────── */
                <>
                  {/* stdin */}
                  <div className="flex flex-col border-b border-neutral-800 flex-shrink-0" style={{ height: 130 }}>
                    <div className="px-4 py-2 bg-neutral-900/60 border-b border-neutral-800 flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-emerald-400">› Оролт (stdin)</span>
                    </div>
                    <textarea
                      value={stdin}
                      onChange={e => setStdin(e.target.value)}
                      placeholder="5&#10;10"
                      className="flex-1 bg-neutral-950 text-neutral-200 text-xs px-4 py-3 resize-none outline-none placeholder:text-neutral-700"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    />
                  </div>

                  {/* Output */}
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex items-center bg-neutral-900/60 border-b border-neutral-800 flex-shrink-0">
                      {(['output', 'stderr', 'compile'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-2 text-xs transition-colors relative ${
                            activeTab === tab ? 'text-emerald-400 font-semibold' : 'text-neutral-600 hover:text-neutral-400'
                          }`}
                        >
                          {tab === 'output' ? 'Гаралт' : tab === 'stderr' ? 'Stderr' : 'Compile'}
                          {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
                        </button>
                      ))}

                      {result && statusInfo && (
                        <div className={`ml-auto flex items-center gap-1.5 px-4 ${statusColor}`}>
                          {isSuccess ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                          <span className="text-xs font-semibold truncate">{statusInfo.label}</span>
                        </div>
                      )}
                    </div>

                    {result && (
                      <div className="flex items-center gap-5 px-4 py-1.5 bg-neutral-900/30 border-b border-neutral-800/50 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-neutral-600">
                          <Clock size={10} />
                          <span className="text-xs">{result.time}с</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-600">
                          <Cpu size={10} />
                          <span className="text-xs">
                            {result.memoryKb ? `${(result.memoryKb / 1024).toFixed(1)} МБ` : '—'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex-1 overflow-auto p-4 select-text">
                      {running && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-700">
                          <Loader2 size={24} className="animate-spin text-emerald-500" />
                          <span className="text-xs">Ажиллаж байна...</span>
                        </div>
                      )}
                      {apiError && !running && (
                        <div className="text-red-400 text-xs leading-5">
                          <div className="flex items-center gap-1.5 mb-2 font-semibold">
                            <AlertCircle size={12} />Алдаа
                          </div>
                          <pre className="whitespace-pre-wrap">{apiError}</pre>
                        </div>
                      )}
                      {!running && !apiError && !result && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-700">
                          <Terminal size={24} />
                          <span className="text-xs">"Ажиллуулах" дарна уу</span>
                        </div>
                      )}
                      {!running && result && (
                        <pre className={`text-xs whitespace-pre-wrap leading-6 ${
                          activeTab === 'output'  ? 'text-neutral-100' :
                          activeTab === 'stderr'  ? 'text-red-400' :
                                                   'text-amber-400'
                        }`}>
                          {activeTab === 'output'  && (result.stdout        || <span className="text-neutral-700 italic">Гаралт байхгүй</span>)}
                          {activeTab === 'stderr'  && (result.stderr        || <span className="text-neutral-700 italic">Stderr байхгүй</span>)}
                          {activeTab === 'compile' && (result.compileOutput || <span className="text-neutral-700 italic">Компиляцийн гаралт байхгүй</span>)}
                        </pre>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
