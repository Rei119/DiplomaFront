'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Play, RotateCcw, Copy, Check, ChevronDown, Terminal,
  Clock, Cpu, AlertCircle, CheckCircle, Loader2, Settings2,
  ChevronRight, X, FileCode, FolderOpen, Plus, Trash2, 
  Maximize2, Minimize2, File, Folder
} from 'lucide-react';

// Same COMPILER_LANGUAGES and Judge0 setup as before
export const COMPILER_LANGUAGES = [
  { id: 71, name: 'Python 3', ext: 'py', color: '#3b82f6', starter: '# Python 3\nprint("Hello, World!")\n' },
  { id: 63, name: 'JavaScript', ext: 'js', color: '#eab308', starter: '// JavaScript\nconsole.log("Hello, World!");\n' },
  { id: 74, name: 'TypeScript', ext: 'ts', color: '#60a5fa', starter: '// TypeScript\nconst message: string = "Hello, World!";\nconsole.log(message);\n' },
  { id: 62, name: 'Java', ext: 'java', color: '#f97316', starter: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n' },
  { id: 54, name: 'C++', ext: 'cpp', color: '#a855f7', starter: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n' },
  { id: 50, name: 'C', ext: 'c', color: '#6366f1', starter: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n' },
] as const;

export type CompilerLanguage = typeof COMPILER_LANGUAGES[number];

const STATUS: Record<number, { label: string; type: 'success' | 'error' | 'warning' | 'info' }> = {
  1:  { label: 'Дараалалд байна', type: 'info' },
  2:  { label: 'Боловсруулж байна', type: 'info' },
  3:  { label: 'Амжилттай', type: 'success' },
  6:  { label: 'Компиляцийн алдаа', type: 'error' },
  7:  { label: 'Runtime алдаа', type: 'error' },
};

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
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

interface IDECodeEditorProps {
  initialCode?: string;
  initialLanguageId?: number;
  onCodeChange?: (code: string, languageId: number) => void;
  examMode?: boolean;
}

const toB64 = (str: string) => btoa(unescape(encodeURIComponent(str)));
const fromB64 = (b64: string | null | undefined): string => {
  if (!b64) return '';
  try { return decodeURIComponent(escape(atob(b64))); } catch { return b64; }
};

export default function IDECodeEditor({
  initialCode,
  initialLanguageId = 71,
  onCodeChange,
  examMode = false,
}: IDECodeEditorProps) {
  const JUDGE0_URL = 'https://ce.judge0.com';
  const initLang = COMPILER_LANGUAGES.find(l => l.id === initialLanguageId) ?? COMPILER_LANGUAGES[0];

  // File system state
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Editor state
  const [stdin, setStdin] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'output' | 'stderr' | 'compile'>('output');
  const [timeLimit, setTimeLimit] = useState(5);
  const [memLimit, setMemLimit] = useState(128);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeFile = files.find(f => f.id === activeFileId);
  const currentLang = COMPILER_LANGUAGES.find(l => l.id === activeFile?.languageId) ?? initLang;

  const updateFileContent = useCallback((fileId: string, content: string) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content } : f));
    if (fileId === activeFileId) {
      onCodeChange?.(content, currentLang.id);
    }
  }, [activeFileId, currentLang.id, onCodeChange]);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (activeFile) {
      updateFileContent(activeFile.id, e.target.value);
    }
  }, [activeFile, updateFileContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    if (!activeFile) return;
    const el = e.currentTarget;
    const s = el.selectionStart;
    const end = el.selectionEnd;
    const next = (activeFile.content || '').slice(0, s) + '  ' + (activeFile.content || '').slice(end);
    updateFileContent(activeFile.id, next);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2; });
  }, [activeFile, updateFileContent]);

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
    if (files.length === 1) {
      alert('Хамгийн багадаа 1 файл байх ёстой');
      return;
    }
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFileId === fileId) {
      const remaining = files.filter(f => f.id !== fileId);
      setActiveFileId(remaining[0]?.id || '');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const runCode = async () => {
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
          `${JUDGE0_URL}/submissions/${token}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time,memory`,
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

  const copyCode = async () => {
    if (activeFile?.content) {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetCode = () => {
    if (activeFile) {
      updateFileContent(activeFile.id, currentLang.starter);
      setResult(null);
      setApiError(null);
    }
  };

  const statusInfo = result ? (STATUS[result.statusId] ?? { label: result.statusLabel, type: 'info' }) : null;
  const isSuccess = result?.statusId === 3;
  const lines = (activeFile?.content || '').split('\n');

  const statusColor = statusInfo
    ? statusInfo.type === 'success' ? 'text-emerald-400'
    : statusInfo.type === 'error' ? 'text-red-400'
    : statusInfo.type === 'warning' ? 'text-amber-400'
    : 'text-neutral-400'
    : '';

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-neutral-950'
    : examMode
    ? 'h-[600px]'
    : 'h-[700px]';

  return (
    <div className={`${containerClass} flex flex-col bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 font-mono text-sm`}>
      
      {/* Top toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border-b border-neutral-800 flex-shrink-0">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Code IDE
        </span>

        <div className="flex-1" />

        {/* Settings */}
        <div ref={settingsRef} className="relative">
          <button
            onClick={() => setSettingsOpen(v => !v)}
            className="p-1.5 text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
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

        <button onClick={copyCode} className="p-1.5 text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors">
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>

        <button onClick={resetCode} className="p-1.5 text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors">
          <RotateCcw size={14} />
        </button>

        <button onClick={toggleFullscreen} className="p-1.5 text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors">
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>

        <button
          onClick={runCode}
          disabled={running}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all"
        >
          {running
            ? <><Loader2 size={13} className="animate-spin" />Ажиллаж байна</>
            : <><Play size={13} />Ажиллуулах</>}
        </button>
      </div>

      {/* Main IDE area */}
      <div className="flex flex-1 min-h-0">
        
        {/* Left sidebar - File tree */}
        <div className="w-56 bg-neutral-900/50 border-r border-neutral-800 flex flex-col flex-shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
            <div className="flex items-center gap-1.5">
              <FolderOpen size={14} className="text-amber-500" />
              <span className="text-xs font-semibold text-neutral-300">Файлууд</span>
            </div>
            <button
              onClick={addNewFile}
              className="p-1 text-neutral-600 hover:text-emerald-400 hover:bg-neutral-800 rounded transition-colors"
              title="Шинэ файл"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {files.map(file => (
              <div
                key={file.id}
                className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors ${
                  activeFileId === file.id
                    ? 'bg-primary-900/30 text-primary-400'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                }`}
                onClick={() => setActiveFileId(file.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileCode size={13} className="flex-shrink-0" />
                  <span className="text-xs truncate">{file.name}</span>
                </div>
                {files.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                    className="p-0.5 text-neutral-600 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Editor area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* File tabs */}
          <div className="flex items-center gap-1 px-2 py-1 bg-neutral-900/30 border-b border-neutral-800 flex-shrink-0 overflow-x-auto">
            {files.map(file => (
              <button
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs transition-colors ${
                  activeFileId === file.id
                    ? 'bg-neutral-950 text-neutral-200 border-t border-x border-neutral-800'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: currentLang.color }} />
                {file.name}
              </button>
            ))}
          </div>

          {/* Code editor */}
          <div className="flex flex-1 min-h-0">
            <div className="flex flex-col flex-1 min-w-0 border-r border-neutral-800">
              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Line numbers */}
                <div className="w-12 bg-neutral-950 border-r border-neutral-900 flex-shrink-0 overflow-hidden pt-3 pb-3">
                  {lines.map((_, i) => (
                    <div key={i} className="h-6 flex items-center justify-end pr-3 text-neutral-700 text-xs leading-6">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Code textarea */}
                <textarea
                  ref={taRef}
                  value={activeFile?.content || ''}
                  onChange={handleCodeChange}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  className="flex-1 bg-neutral-950 text-neutral-100 text-xs leading-6 px-4 py-3 resize-none outline-none overflow-auto caret-emerald-400 selection:bg-emerald-900/40 select-text"
                  style={{ tabSize: 2, fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
                />
              </div>
            </div>

            {/* Right panel */}
            <div className="flex flex-col w-80 flex-shrink-0">
              {/* Input */}
              <div className="flex flex-col border-b border-neutral-800" style={{ height: 140 }}>
                <div className="px-3 py-2 bg-neutral-900/60 border-b border-neutral-800 flex items-center gap-1.5">
                  <ChevronRight size={11} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-400">Оролт (stdin)</span>
                </div>
                <textarea
                  value={stdin}
                  onChange={e => setStdin(e.target.value)}
                  placeholder="5\n10"
                  className="flex-1 bg-neutral-950 text-neutral-200 text-sm px-3 py-2 resize-none outline-none placeholder:text-neutral-600"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              {/* Output */}
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center bg-neutral-900/60 border-b border-neutral-800">
                  {(['output', 'stderr', 'compile'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 text-xs transition-colors relative ${
                        activeTab === tab ? 'text-emerald-400' : 'text-neutral-600 hover:text-neutral-400'
                      }`}
                    >
                      {tab === 'output' ? 'Гаралт' : tab === 'stderr' ? 'Stderr' : 'Compile'}
                      {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-px bg-emerald-500" />}
                    </button>
                  ))}

                  {result && statusInfo && (
                    <div className={`ml-auto flex items-center gap-1.5 px-3 ${statusColor}`}>
                      {isSuccess ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                      <span className="text-xs font-semibold truncate">{statusInfo.label}</span>
                    </div>
                  )}
                </div>

                {result && (
                  <div className="flex items-center gap-4 px-3 py-1 bg-neutral-900/30 border-b border-neutral-800/40">
                    <div className="flex items-center gap-1 text-neutral-600">
                      <Clock size={10} />
                      <span className="text-xs">{result.time}с</span>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-600">
                      <Cpu size={10} />
                      <span className="text-xs">
                        {result.memoryKb ? `${(result.memoryKb / 1024).toFixed(1)} МБ` : '—'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-auto p-3 select-text">
                  {running && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-700">
                      <Loader2 size={22} className="animate-spin text-emerald-500" />
                      <span className="text-xs">Ажиллаж байна...</span>
                    </div>
                  )}

                  {apiError && !running && (
                    <div className="text-red-400 text-xs leading-5">
                      <div className="flex items-center gap-1.5 mb-1.5 font-semibold">
                        <AlertCircle size={12} />Алдаа
                      </div>
                      <pre className="whitespace-pre-wrap">{apiError}</pre>
                    </div>
                  )}

                  {!running && !apiError && !result && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-neutral-700">
                      <Terminal size={22} />
                      <span className="text-xs">"Ажиллуулах" дарна уу</span>
                    </div>
                  )}

                  {!running && result && (
                    <pre className={`text-xs whitespace-pre-wrap leading-5 ${
                      activeTab === 'output' ? 'text-neutral-100' :
                      activeTab === 'stderr' ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {activeTab === 'output' && (result.stdout || <span className="text-neutral-700 italic">Гаралт байхгүй</span>)}
                      {activeTab === 'stderr' && (result.stderr || <span className="text-neutral-700 italic">Stderr байхгүй</span>)}
                      {activeTab === 'compile' && (result.compileOutput || <span className="text-neutral-700 italic">Компиляцийн гаралт байхгүй</span>)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}