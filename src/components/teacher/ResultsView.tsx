'use client';

import { useState, useEffect, useRef } from 'react';
import type { Submission, Exam, Question } from '../../types';
import {
  BarChart3, Eye, AlertTriangle, CheckCircle, Edit2, Save, X,
  Trophy, Users, TrendingUp, Sparkles, Loader2,
  ShieldAlert, ShieldCheck, ChevronRight, Clock, Award,
  Video, PlayCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { detectAI } from '../../lib/ai-detection/aiDetector';
import { submissionsAPI } from '@/lib/api/client';
import TeacherCodeViewer from './TeacherCodeViewer';

interface ResultsViewProps {
  submissions: Submission[];
  exams: Exam[];
}

interface CameraClip {
  id: string;
  submission_id: string;
  timestamp: number;
  url: string;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable label for a submission's student.
 * - If student_id_number is missing or 'Unknown', falls back to UUID
 * - Appends major only if it's not 'Unknown'
 */
function getStudentLabel(sub: Submission): string {
  const fullName = sub.student_full_name?.trim();
  const username = sub.student_username?.trim();
  const idNum    = sub.student_id_number?.trim();
  const major    = sub.student_major?.trim();

  const hasId    = idNum  && idNum  !== 'Unknown' && idNum  !== '';
  const hasMajor = major  && major  !== 'Unknown' && major  !== '';

  // Build label: "Full Name · 22B1NUM0002 · Програм хангамж"
  const parts: string[] = [];
  const displayName = fullName || username;
  if (displayName) parts.push(displayName);
  if (hasId)       parts.push(idNum!);
  if (hasMajor)    parts.push(major!);

  return parts.length > 0 ? parts.join(' · ') : sub.student_id;
}

function ScoreBar({ score, passing }: { score: number; passing: number }) {
  const pct    = Math.min(100, Math.max(0, score));
  const passed = pct >= passing;
  return (
    <div className="w-full">
      <div className="relative h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${passed ? 'bg-primary-500' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-neutral-300" style={{ left: `${passing}%` }} />
      </div>
      <div className="flex justify-between text-xs text-neutral-400 mt-1">
        <span className={`font-medium ${passed ? 'text-primary-600' : 'text-red-500'}`}>{pct.toFixed(1)}%</span>
        <span>Тэнцэх: {passing}%</span>
      </div>
    </div>
  );
}

function InlineScoreEditor({ submissionId, currentScore, onSave }: {
  submissionId: string;
  currentScore: number | null;
  onSave: (id: string, score: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(currentScore ?? 0);
  const [saving, setSaving]   = useState(false);

  useEffect(() => { setVal(currentScore ?? 0); }, [currentScore]);

  const save = async () => {
    setSaving(true);
    await onSave(submissionId, val);
    setSaving(false); setEditing(false);
  };

  if (!editing) return (
    <div className="flex items-center gap-1">
      <span className={`font-bold ${currentScore != null ? 'text-neutral-900' : 'text-neutral-400'}`}>
        {currentScore != null ? `${currentScore.toFixed(1)}%` : '—'}
      </span>
      <button onClick={() => { setVal(currentScore ?? 0); setEditing(true); }}
        className="p-1 text-neutral-300 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors" title="Засах">
        <Edit2 size={12} />
      </button>
    </div>
  );

  return (
    <div className="flex items-center gap-1">
      <input type="number" value={val} onChange={e => setVal(Number(e.target.value))} min={0} max={100}
        className="w-16 px-2 py-1 border-2 border-primary-400 rounded-lg text-sm font-bold text-center focus:outline-none"
        autoFocus onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} />
      <button onClick={save} disabled={saving}
        className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
        {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
      </button>
      <button onClick={() => setEditing(false)} className="p-1.5 bg-neutral-100 text-neutral-500 rounded-lg hover:bg-neutral-200 transition-colors">
        <X size={11} />
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: 'passed' | 'failed' | 'cheat' | 'pending' }) {
  const map = {
    passed:  { label: 'Тэнцсэн',         cls: 'bg-primary-50 text-primary-700 border-primary-200' },
    failed:  { label: 'Тэнцээгүй',       cls: 'bg-red-50 text-red-700 border-red-200' },
    cheat:   { label: 'Хуурсан',         cls: 'bg-red-50 text-red-700 border-red-200' },
    pending: { label: 'Хүлээгдэж байна', cls: 'bg-neutral-100 text-neutral-500 border-neutral-200' },
  };
  const { label, cls } = map[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${cls}`}>{label}</span>;
}

function getStatus(sub: Submission, passingScore: number): 'passed' | 'failed' | 'cheat' | 'pending' {
  if (sub.status === 'failed') return 'cheat';
  if (sub.total_score == null) return 'pending';
  return sub.total_score >= passingScore ? 'passed' : 'failed';
}

// ── Camera Clips Panel ─────────────────────────────────────────────────────────
function CameraClipsPanel({ submissionId, lookDownCount }: {
  submissionId: string;
  lookDownCount: number;
}) {
  const [clips, setClips]       = useState<CameraClip[]>([]);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const loadClips = async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/clips`);
      if (res.ok) {
        const data = await res.json();
        setClips(data.clips ?? []);
      }
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  };

  const toggle = () => {
    if (!expanded) loadClips();
    setExpanded(v => !v);
  };

  if (lookDownCount === 0) return null;

  const isHigh = lookDownCount >= 5;

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isHigh ? 'border-red-200 dark:border-red-800' : 'border-amber-200 dark:border-amber-800'
    }`}>
      <button
        onClick={toggle}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
          isHigh
            ? 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30'
            : 'bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30'
        }`}
      >
        <div className="flex items-center gap-2">
          <Video size={15} className={isHigh ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} />
          <span className={`text-sm font-semibold ${
            isHigh ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'
          }`}>
            Камерын бичлэг — доош харсан: {lookDownCount} удаа
          </span>
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-neutral-400" />
          : <ChevronDown size={14} className="text-neutral-400" />}
      </button>

      {expanded && (
        <div className="p-4 bg-white dark:bg-neutral-900">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Loader2 size={14} className="animate-spin" /> Бичлэг ачааллаж байна...
            </div>
          )}
          {!loading && clips.length === 0 && (
            <p className="text-sm text-neutral-400 italic">
              Бичлэг байхгүй — тоолол зөвхөн серверт хадгалагдсан.
            </p>
          )}
          {!loading && clips.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {clips.map((clip) => (
                <div key={clip.id} className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                  <div className="relative bg-black aspect-video">
                    {activeClip === clip.id ? (
                      <video src={clip.url} className="w-full h-full object-cover" controls autoPlay />
                    ) : (
                      <button onClick={() => setActiveClip(clip.id)}
                        className="w-full h-full flex items-center justify-center hover:bg-white/10 transition-colors">
                        <PlayCircle size={32} className="text-white/80" />
                      </button>
                    )}
                  </div>
                  <div className="px-2 py-1.5 bg-neutral-50 dark:bg-neutral-800">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(clip.timestamp).toLocaleTimeString('mn-MN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const LANG_IDS: Record<string, number> = {
  python: 71, python3: 71,
  javascript: 63, js: 63,
  typescript: 74, ts: 74,
  java: 62,
  c: 50,
  'c++': 54, cpp: 54,
  'c#': 51, csharp: 51, cs: 51,
  php: 68,
  swift: 83,
  kotlin: 78, kt: 78,
  go: 60,
  r: 80,
  rust: 73, rs: 73,
  ruby: 72, rb: 72,
  html: 0, 'html/css/js': 0, web: 0,
};

export default function ResultsView({ submissions, exams }: ResultsViewProps) {
  const [selectedExam, setSelectedExam]             = useState<Exam | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [localSubs, setLocalSubs]                   = useState<Submission[]>(submissions);
  const [aiResults, setAiResults]                   = useState<Record<string, any>>({});
  const [checkingAI, setCheckingAI]                 = useState<string | null>(null);
  const [manualOverrides, setManualOverrides]       = useState<Record<string, boolean>>({});

  useEffect(() => { setLocalSubs(submissions); }, [submissions]);

  const getExam     = (id: string) => exams.find(e => e.id === id);
  const getExamSubs = (id: string) => localSubs.filter(s => s.exam_id === id);

  const handleSaveScore = async (submissionId: string, score: number) => {
    try {
      await submissionsAPI.updateScore(submissionId, score);
      setLocalSubs(prev =>
        prev.map(s => s.id === submissionId ? { ...s, total_score: score } : s)
      );
      if (selectedSubmission?.id === submissionId)
        setSelectedSubmission(prev => prev ? { ...prev, total_score: score } : prev);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Оноо шинэчлэхэд алдаа гарлаа');
    }
  };

  const handleCheckAI = async (questionId: string, answer: string) => {
    setCheckingAI(questionId);
    try {
      const result = await detectAI(answer);
      setAiResults(prev => ({ ...prev, [questionId]: result }));
    } catch { console.error('AI шалгалт амжилтгүй'); }
    finally { setCheckingAI(null); }
  };

  const calcStats = (examId: string) => {
    const subs   = getExamSubs(examId);
    const exam   = getExam(examId);
    if (!subs.length) return null;
    const scored    = subs.filter(s => s.total_score != null);
    const scores    = scored.map(s => s.total_score as number);
    const avg       = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const passing   = exam?.passing_score || 70;
    const passCount = scores.filter(s => s >= passing).length;
    return {
      total: subs.length, scored: scored.length,
      pending: subs.length - scored.length, avg,
      max: scores.length ? Math.max(...scores) : 0,
      passRate: scores.length ? (passCount / scores.length) * 100 : 0,
      passCount, failCount: scores.length - passCount,
      cheats: subs.filter(s => s.status === 'failed').length,
    };
  };

  // ── LEVEL 3: Individual Submission ────────────────────────────────────────
  if (selectedSubmission && selectedExam) {
    const score         = selectedSubmission.total_score ?? null;
    const status        = getStatus(selectedSubmission, selectedExam.passing_score || 70);
    const lookDownCount = (selectedSubmission as any).look_down_count ?? 0;
    const studentLabel  = getStudentLabel(selectedSubmission);

    return (
      <div className="space-y-4 max-w-4xl">
        <nav className="flex items-center gap-1.5 text-xs">
          <button onClick={() => setSelectedExam(null)}
            className="text-neutral-400 hover:text-neutral-700 transition-colors">Үр дүн</button>
          <ChevronRight size={12} className="text-neutral-300" />
          <button onClick={() => setSelectedSubmission(null)}
            className="text-neutral-400 hover:text-neutral-700 transition-colors">{selectedExam.title}</button>
          <ChevronRight size={12} className="text-neutral-300" />
          <span className="text-neutral-600 font-medium">{studentLabel}</span>
        </nav>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-bold text-neutral-900 dark:text-neutral-100 mb-0.5">{selectedExam.title}</h2>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {selectedSubmission.student_full_name || selectedSubmission.student_username}
                </p>
                {(() => {
                  const idNum = selectedSubmission.student_id_number?.trim();
                  return idNum && idNum !== selectedSubmission.student_username
                    ? <span className="text-xs font-mono font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded">{idNum}</span>
                    : null;
                })()}
              </div>
              {selectedSubmission.student_major?.trim() && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {selectedSubmission.student_major}
                </p>
              )}
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                {new Date(selectedSubmission.created_at).toLocaleString('mn-MN')}
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="grid grid-cols-5 gap-3 mb-4">
            {[
              {
                label: 'Нийт оноо',
                content: <InlineScoreEditor submissionId={selectedSubmission.id} currentScore={score} onSave={handleSaveScore} />,
                bg: 'bg-primary-50 dark:bg-primary-900/20',
              },
              {
                label: 'Тэнцэх оноо',
                content: <span className="font-bold text-neutral-700 dark:text-neutral-300">{selectedExam.passing_score || 70}%</span>,
                bg: 'bg-neutral-50 dark:bg-neutral-800',
              },
              {
                label: 'Таб солилт',
                content: (
                  <span className={`font-bold ${(selectedSubmission.tab_switches ?? 0) > 0 ? 'text-amber-600' : 'text-neutral-700 dark:text-neutral-300'}`}>
                    {selectedSubmission.tab_switches ?? 0}
                  </span>
                ),
                bg: 'bg-neutral-50 dark:bg-neutral-800',
              },
              {
                label: 'Доош харсан',
                content: (
                  <span className={`font-bold ${
                    lookDownCount === 0 ? 'text-neutral-700 dark:text-neutral-300'
                    : lookDownCount < 5 ? 'text-amber-600'
                    : 'text-red-600'
                  }`}>
                    {lookDownCount}
                  </span>
                ),
                bg: lookDownCount === 0
                  ? 'bg-neutral-50 dark:bg-neutral-800'
                  : lookDownCount < 5
                    ? 'bg-amber-50 dark:bg-amber-900/20'
                    : 'bg-red-50 dark:bg-red-900/20',
              },
              {
                label: 'Асуулт',
                content: <span className="font-bold text-neutral-700 dark:text-neutral-300">{selectedExam.questions?.length ?? 0}</span>,
                bg: 'bg-neutral-50 dark:bg-neutral-800',
              },
            ].map(({ label, content, bg }) => (
              <div key={label} className={`${bg} rounded-lg p-3`}>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">{label}</p>
                {content}
              </div>
            ))}
          </div>

          {score != null && <ScoreBar score={score} passing={selectedExam.passing_score || 70} />}
        </div>

        <CameraClipsPanel submissionId={selectedSubmission.id} lookDownCount={lookDownCount} />

        <div className="space-y-4">
          {selectedExam.questions?.map((question: Question, index: number) => {
            const answer        = (selectedSubmission.answers as Record<string, string>)?.[question.id];
            const aiResult      = aiResults[question.id];
            const correctAnswer = ('correct_answer' in question) ? (question as any).correct_answer as string : undefined;
            const autoCorrect   = correctAnswer !== undefined && answer === correctAnswer;
            const isCorrect     = question.id in manualOverrides ? manualOverrides[question.id] : autoCorrect;
            const hasCorrect    = correctAnswer !== undefined || question.type === 'code' || question.type === 'essay';
            const wasOverridden = question.id in manualOverrides;

            return (
              <div key={question.id} className={`bg-white dark:bg-neutral-900 border rounded-xl overflow-hidden ${
                hasCorrect && answer
                  ? (isCorrect ? 'border-primary-200 dark:border-primary-800' : 'border-red-200 dark:border-red-800')
                  : 'border-neutral-200 dark:border-neutral-800'
              }`}>
                <div className={`px-4 py-3 flex items-center justify-between ${
                  hasCorrect && answer
                    ? (isCorrect ? 'bg-primary-50/40 dark:bg-primary-950/20' : 'bg-red-50/40 dark:bg-red-950/20')
                    : 'bg-neutral-50 dark:bg-neutral-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-primary-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">{question.question}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{question.type} · {question.points} оноо</p>
                    </div>
                  </div>
                  {hasCorrect && answer && (
                    <button
                      onClick={() => setManualOverrides(prev => ({ ...prev, [question.id]: !isCorrect }))}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex-shrink-0 ${
                        isCorrect
                          ? 'bg-white dark:bg-neutral-900 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-950/30'
                          : 'bg-white dark:bg-neutral-900 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30'
                      }`}
                    >
                      {isCorrect ? <CheckCircle size={11} /> : <X size={11} />}
                      {isCorrect ? 'Зөв' : 'Буруу'}
                      {wasOverridden && <span className="opacity-50 ml-0.5">✎</span>}
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {question.type === 'code' && answer ? (
                    <TeacherCodeViewer
                      code={answer}
                      languageId={LANG_IDS[(((question as any).language || 'python').toLowerCase())] ?? 71}
                      studentName={studentLabel}
                      questionTitle={question.question}
                      maxPoints={question.points}
                      currentScore={0}
                      showGrading={false}
                    />
                  ) : question.type === 'code' && !answer ? (
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-center">
                      <p className="text-sm text-neutral-400 dark:text-neutral-500 italic">Хариулаагүй</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-1.5">Оюутны хариулт</p>
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                        <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                          {answer || <span className="text-neutral-300 dark:text-neutral-600 italic">Хариулаагүй</span>}
                        </p>
                      </div>
                    </div>
                  )}

                  {correctAnswer && (
                    <div className="p-3 bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-800 rounded-lg">
                      <p className="text-xs font-semibold text-primary-500 dark:text-primary-400 mb-1">Зөв хариулт</p>
                      <p className="text-sm text-primary-900 dark:text-primary-200 font-medium">{correctAnswer}</p>
                    </div>
                  )}

                  {question.type === 'essay' && answer && (
                    <div>
                      {!aiResult ? (
                        <button
                          onClick={() => handleCheckAI(question.id, answer)}
                          disabled={checkingAI === question.id}
                          className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {checkingAI === question.id
                            ? <><Loader2 size={13} className="animate-spin" />Шинжилж байна...</>
                            : <><Sparkles size={13} />AI агуулга шалгах</>}
                        </button>
                      ) : (
                        <div className={`rounded-xl border p-4 ${
                          aiResult.verdict === 'AI'
                            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                            : aiResult.verdict === 'UNCERTAIN'
                              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                              : 'bg-primary-50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {aiResult.verdict === 'AI' ? (
                                <><ShieldAlert className="text-red-600 dark:text-red-400" size={16} /><span className="font-bold text-red-800 dark:text-red-400 text-sm">AI бичсэн ({aiResult.confidence}%)</span></>
                              ) : aiResult.verdict === 'UNCERTAIN' ? (
                                <><AlertTriangle className="text-amber-600 dark:text-amber-400" size={16} /><span className="font-bold text-amber-800 dark:text-amber-400 text-sm">Тодорхойгүй</span></>
                              ) : (
                                <><ShieldCheck className="text-primary-600 dark:text-primary-400" size={16} /><span className="font-bold text-primary-800 dark:text-primary-300 text-sm">Хүний бичсэн ({aiResult.confidence}%)</span></>
                              )}
                            </div>
                            <button
                              onClick={() => setAiResults(prev => { const n = { ...prev }; delete n[question.id]; return n; })}
                              className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                            >
                              Арилгах
                            </button>
                          </div>

                          <div className="mb-3">
                            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden mb-1">
                              <div
                                className={`h-full rounded-full ${aiResult.confidence >= 70 ? 'bg-red-500' : aiResult.confidence >= 40 ? 'bg-amber-500' : 'bg-primary-500'}`}
                                style={{ width: `${aiResult.confidence}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-neutral-400">
                              <span>Хүн</span><span>AI</span>
                            </div>
                          </div>

                          {aiResult.reasoning && (
                            <p className="text-xs text-neutral-700 dark:text-neutral-300 bg-white/60 dark:bg-black/20 rounded-lg p-2.5 mb-2 leading-relaxed">
                              {aiResult.reasoning}
                            </p>
                          )}

                          <div className="space-y-1.5">
                            {aiResult.breakdown?.filter((b: any) => b.findings.length > 0).map((b: any, i: number) => (
                              <div key={i} className={`rounded-lg p-2.5 border text-xs ${
                                b.points < 0
                                  ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-100 dark:border-primary-800'
                                  : 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-800'
                              }`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`font-semibold ${b.points < 0 ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'}`}>{b.category}</span>
                                  <span className={`font-bold ${b.points < 0 ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'}`}>{b.points > 0 ? '+' : ''}{b.points}</span>
                                </div>
                                <ul className="space-y-0.5">
                                  {b.findings.map((f: string, j: number) => (
                                    <li key={j} className={b.points < 0 ? 'text-primary-700 dark:text-primary-300' : 'text-red-700 dark:text-red-300'}>· {f}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-neutral-400 mt-2 text-center">Эцсийн шийдвэрийг багш гаргана</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── LEVEL 2: Student list ──────────────────────────────────────────────────
  if (selectedExam) {
    const examSubs = getExamSubs(selectedExam.id);
    const stats    = calcStats(selectedExam.id);
    const passing  = selectedExam.passing_score || 70;

    return (
      <div className="space-y-4 max-w-3xl">
        <nav className="flex items-center gap-1.5 text-xs">
          <button onClick={() => setSelectedExam(null)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">Үр дүн</button>
          <ChevronRight size={12} className="text-neutral-300 dark:text-neutral-600" />
          <span className="text-neutral-600 dark:text-neutral-400 font-medium">{selectedExam.title}</span>
        </nav>

        {stats && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <h2 className="font-bold text-neutral-900 dark:text-neutral-100 mb-1">{selectedExam.title}</h2>
            {selectedExam.description && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-4">{selectedExam.description}</p>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
              {[
                { icon: Users,         label: 'Нийт',            value: stats.total,                                   color: 'text-neutral-700 dark:text-neutral-300' },
                { icon: TrendingUp,    label: 'Дундаж',          value: stats.scored ? `${stats.avg.toFixed(0)}%` : '—', color: 'text-primary-700 dark:text-primary-400' },
                { icon: Trophy,        label: 'Хамгийн өндөр',   value: stats.scored ? `${stats.max.toFixed(0)}%` : '—', color: 'text-primary-700 dark:text-primary-400' },
                { icon: Award,         label: 'Тэнцэх хувь',     value: stats.scored ? `${stats.passRate.toFixed(0)}%` : '—', color: 'text-primary-700 dark:text-primary-400' },
                { icon: Clock,         label: 'Хүлээгдэж байна', value: stats.pending,                                 color: stats.pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400 dark:text-neutral-500' },
                { icon: AlertTriangle, label: 'Хуурсан',         value: stats.cheats,                                  color: stats.cheats  > 0 ? 'text-red-600 dark:text-red-400'    : 'text-neutral-400 dark:text-neutral-500' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                  <div className="flex items-center gap-1 mb-1 text-neutral-400 dark:text-neutral-500">
                    <Icon size={11} /><p className="text-xs">{label}</p>
                  </div>
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {stats.scored > 0 && (
              <div>
                <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-primary-500 transition-all" style={{ width: `${stats.passRate}%` }} />
                  <div className="h-full bg-red-400 transition-all"     style={{ width: `${100 - stats.passRate}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1 text-neutral-400 dark:text-neutral-500">
                  <span className="text-primary-600 dark:text-primary-400 font-medium">{stats.passCount} тэнцсэн</span>
                  <span className="text-red-500 dark:text-red-400 font-medium">{stats.failCount} тэнцээгүй</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {examSubs
            .slice()
            .sort((a, b) => (b.total_score ?? -1) - (a.total_score ?? -1))
            .map((sub, rank) => {
              const status        = getStatus(sub, passing);
              const lookDownCount = (sub as any).look_down_count ?? 0;
              const studentLabel  = getStudentLabel(sub);

              return (
                <div key={sub.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 rounded-xl overflow-hidden transition-colors">
                  <div className="px-4 py-3 flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                      status === 'cheat' ? 'bg-red-400' : status === 'passed' ? 'bg-primary-600' : 'bg-neutral-300'
                    }`}>{rank + 1}</span>

                    <div className="flex-1 min-w-0">
                      {(() => {
                        const name = sub.student_full_name || sub.student_username;
                        const idNum = sub.student_id_number?.trim();
                        const isRealId = idNum && idNum !== sub.student_username;
                        const major = sub.student_major?.trim();
                        return (
                          <>
                            <div className="flex items-center gap-2 truncate">
                              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{name}</p>
                              {isRealId && (
                                <span className="flex-shrink-0 text-xs font-mono font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded">
                                  {idNum}
                                </span>
                              )}
                            </div>
                            {major && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{major}</p>
                            )}
                          </>
                        );
                      })()}
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                        {new Date(sub.created_at).toLocaleString('mn-MN')}
                        {sub.tab_switches > 0 && (
                          <span className="text-amber-500 dark:text-amber-400">{sub.tab_switches} tab</span>
                        )}
                        {lookDownCount > 0 && (
                          <span className={`flex items-center gap-0.5 ${lookDownCount >= 5 ? 'text-red-500' : 'text-amber-500'}`}>
                            <Eye size={10} /> {lookDownCount}↓
                          </span>
                        )}
                      </p>
                    </div>

                    <InlineScoreEditor submissionId={sub.id} currentScore={sub.total_score ?? null} onSave={handleSaveScore} />
                    <StatusBadge status={status} />

                    <button
                      onClick={() => setSelectedSubmission(sub)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-xs font-semibold flex-shrink-0"
                    >
                      <Eye size={12} />Харах
                    </button>
                  </div>

                  {sub.total_score != null && (
                    <div className="px-4 pb-2">
                      <ScoreBar score={sub.total_score} passing={passing} />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  // ── LEVEL 1: Exam overview ─────────────────────────────────────────────────
  const examsWithSubs = exams.filter(e => localSubs.some(s => s.exam_id === e.id));

  if (examsWithSubs.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-12 text-center">
        <BarChart3 className="w-10 h-10 text-neutral-200 dark:text-neutral-700 mx-auto mb-3" />
        <p className="font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Үр дүн байхгүй байна</p>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">Оюутнууд шалгалт өгсний дараа харагдана</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Шалгалтын үр дүн</h2>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">{examsWithSubs.length} шалгалт · {localSubs.length} илгээлт</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {examsWithSubs.map(exam => {
          const stats = calcStats(exam.id);
          if (!stats) return null;

          return (
            <div
              key={exam.id}
              onClick={() => setSelectedExam(exam)}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm rounded-xl p-4 cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors line-clamp-2 flex-1 mr-2">
                  {exam.title}
                </h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${
                  exam.status === 'published'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                }`}>
                  {exam.status === 'published' ? 'Нийтлэгдсэн' : 'Ноорог'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">Оюутан</p>
                  <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">{stats.total}</p>
                </div>
                <div className="bg-primary-50 dark:bg-primary-900/30 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-primary-500 dark:text-primary-400">Дундаж</p>
                  <p className="text-base font-bold text-primary-800 dark:text-primary-300 mt-0.5">{stats.scored ? `${stats.avg.toFixed(0)}%` : '—'}</p>
                </div>
                <div className={`rounded-lg p-2.5 text-center ${stats.cheats > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-neutral-50 dark:bg-neutral-800'}`}>
                  <p className={`text-xs ${stats.cheats > 0 ? 'text-red-400' : 'text-neutral-400 dark:text-neutral-500'}`}>Хуурсан</p>
                  <p className={`text-base font-bold mt-0.5 ${stats.cheats > 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-500 dark:text-neutral-400'}`}>{stats.cheats}</p>
                </div>
              </div>

              {stats.scored > 0 && (
                <div className="mb-2">
                  <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${stats.passRate}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                    <span>{stats.passRate.toFixed(0)}% тэнцсэн</span>
                    <span>{stats.passCount}/{stats.scored}</span>
                  </div>
                </div>
              )}

              {stats.pending > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-2">
                  <Clock size={10} />{stats.pending} хүлээгдэж байна
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs text-neutral-400 dark:text-neutral-500">{exam.questions?.length ?? 0} асуулт</span>
                <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-0.5 group-hover:gap-1 transition-all">
                  Харах <ChevronRight size={11} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}