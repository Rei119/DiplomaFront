'use client';

import { useState, useEffect, useRef } from 'react';
import type { Submission, Exam, Question } from '../../types';
import {
  ChevronRight, Edit2, Save, X,
  Sparkles, Loader2, ShieldAlert, ShieldCheck, AlertTriangle,
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

function getStudentLabel(sub: Submission): string {
  const fullName = sub.student_full_name?.trim();
  const username = sub.student_username?.trim();
  const idNum    = sub.student_id_number?.trim();
  const major    = sub.student_major?.trim();
  const hasId    = idNum  && idNum  !== 'Unknown' && idNum  !== '';
  const hasMajor = major  && major  !== 'Unknown' && major  !== '';
  const parts: string[] = [];
  const displayName = fullName || username;
  if (displayName) parts.push(displayName);
  if (hasId)       parts.push(idNum!);
  if (hasMajor)    parts.push(major!);
  return parts.length > 0 ? parts.join(' · ') : sub.student_id;
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
      <span className={`font-semibold tabular-nums ${currentScore != null ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>
        {currentScore != null ? `${currentScore.toFixed(1)}%` : '—'}
      </span>
      <button onClick={() => { setVal(currentScore ?? 0); setEditing(true); }}
        className="p-1 text-neutral-300 hover:text-neutral-600 dark:hover:text-neutral-400 rounded transition-colors" title="Засах">
        <Edit2 size={11} />
      </button>
    </div>
  );

  return (
    <div className="flex items-center gap-1">
      <input type="number" value={val} onChange={e => setVal(Number(e.target.value))} min={0} max={100}
        className="w-16 px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded text-sm font-semibold text-center focus:outline-none focus:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-100"
        autoFocus onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} />
      <button onClick={save} disabled={saving}
        className="p-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded hover:opacity-80 disabled:opacity-40 transition-opacity">
        {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
      </button>
      <button onClick={() => setEditing(false)} className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
        <X size={11} />
      </button>
    </div>
  );
}

function getStatus(sub: Submission, passingScore: number): 'passed' | 'failed' | 'cheat' | 'pending' {
  if (sub.status === 'failed') return 'cheat';
  if (sub.total_score == null) return 'pending';
  return sub.total_score >= passingScore ? 'passed' : 'failed';
}

function CameraClipsPanel({ submissionId, lookDownCount }: {
  submissionId: string;
  lookDownCount: number;
}) {
  const [clips, setClips]           = useState<CameraClip[]>([]);
  const [loading, setLoading]       = useState(false);
  const [expanded, setExpanded]     = useState(false);
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const loadClips = async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/clips`);
      if (res.ok) setClips((await res.json()).clips ?? []);
    } catch {}
    finally { setLoading(false); }
  };

  if (lookDownCount === 0) return null;

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
      <button onClick={() => { if (!expanded) loadClips(); setExpanded(v => !v); }}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition-colors">
        <div className="flex items-center gap-2">
          <Video size={14} className="text-neutral-400" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Камерын бичлэг — доош харсан: <strong>{lookDownCount}</strong> удаа</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
      </button>
      {expanded && (
        <div className="p-4">
          {loading && <p className="text-sm text-neutral-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Ачааллаж байна...</p>}
          {!loading && clips.length === 0 && <p className="text-sm text-neutral-400 italic">Бичлэг байхгүй.</p>}
          {!loading && clips.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {clips.map(clip => (
                <div key={clip.id} className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                  <div className="relative bg-black aspect-video">
                    {activeClip === clip.id
                      ? <video src={clip.url} className="w-full h-full object-cover" controls autoPlay />
                      : <button onClick={() => setActiveClip(clip.id)} className="w-full h-full flex items-center justify-center hover:bg-white/10 transition-colors"><PlayCircle size={32} className="text-white/70" /></button>}
                  </div>
                  <p className="px-2 py-1.5 text-xs text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-800">
                    {new Date(clip.timestamp).toLocaleTimeString('mn-MN')}
                  </p>
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
  python: 71, python3: 71, javascript: 63, js: 63, typescript: 74, ts: 74,
  java: 62, c: 50, 'c++': 54, cpp: 54, 'c#': 51, csharp: 51, cs: 51,
  php: 68, swift: 83, kotlin: 78, kt: 78, go: 60, r: 80,
  rust: 73, rs: 73, ruby: 72, rb: 72, html: 0, 'html/css/js': 0, web: 0,
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
      setLocalSubs(prev => prev.map(s => s.id === submissionId ? { ...s, total_score: score } : s));
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
    } catch {}
    finally { setCheckingAI(null); }
  };

  const calcStats = (examId: string) => {
    const subs  = getExamSubs(examId);
    const exam  = getExam(examId);
    if (!subs.length) return null;
    const scored    = subs.filter(s => s.total_score != null);
    const scores    = scored.map(s => s.total_score as number);
    const avg       = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const passing   = exam?.passing_score || 70;
    const passCount = scores.filter(s => s >= passing).length;
    return {
      total: subs.length, scored: scored.length,
      pending: subs.length - scored.length, avg,
      passRate: scores.length ? (passCount / scores.length) * 100 : 0,
      passCount, failCount: scores.length - passCount,
      cheats: subs.filter(s => s.status === 'failed').length,
    };
  };

  // ── LEVEL 3: Individual Submission ────────────────────────────────────────────
  if (selectedSubmission && selectedExam) {
    const score          = selectedSubmission.total_score ?? null;
    const status         = getStatus(selectedSubmission, selectedExam.passing_score || 70);
    const lookDownCount  = (selectedSubmission as any).look_down_count ?? 0;
    const studentLabel   = getStudentLabel(selectedSubmission);
    const cpCount        = (selectedSubmission as any).copy_paste_count ?? 0;
    const fsCount        = (selectedSubmission as any).fullscreen_exit_count ?? 0;

    const violations = [
      (selectedSubmission.tab_switches ?? 0) > 0 && `${selectedSubmission.tab_switches} таб солилт`,
      cpCount > 0 && `${cpCount} хуулах`,
      fsCount > 0 && `${fsCount} дэлгэц гарсан`,
    ].filter(Boolean) as string[];

    return (
      <div className="space-y-5 max-w-3xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-neutral-400">
          <button onClick={() => setSelectedExam(null)} className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">Үр дүн</button>
          <ChevronRight size={12} />
          <button onClick={() => setSelectedSubmission(null)} className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">{selectedExam.title}</button>
          <ChevronRight size={12} />
          <span className="text-neutral-600 dark:text-neutral-400">{studentLabel}</span>
        </nav>

        {/* Student summary */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 mb-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">{selectedSubmission.student_full_name || selectedSubmission.student_username}</p>
              {selectedSubmission.student_id_number?.trim() && selectedSubmission.student_id_number !== selectedSubmission.student_username && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{selectedSubmission.student_id_number}</p>
              )}
              {selectedSubmission.student_major?.trim() && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{selectedSubmission.student_major}</p>
              )}
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{new Date(selectedSubmission.created_at).toLocaleString('mn-MN')}</p>
              {violations.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">{violations.join(' · ')}</p>
              )}
              {status === 'cheat' && (
                <p className="text-xs text-red-600 dark:text-red-500 mt-1">Хуурлын шалтгаанаар автоматаар тэнцээгүй болсон</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <InlineScoreEditor submissionId={selectedSubmission.id} currentScore={score} onSave={handleSaveScore} />
              {score != null && (
                <p className={`text-xs mt-0.5 ${status === 'passed' ? 'text-green-600 dark:text-green-400' : status === 'failed' ? 'text-red-500 dark:text-red-400' : 'text-neutral-400'}`}>
                  {status === 'passed' ? 'Тэнцсэн' : status === 'failed' ? 'Тэнцээгүй' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        <CameraClipsPanel submissionId={selectedSubmission.id} lookDownCount={lookDownCount} />

        {/* Questions */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {selectedExam.questions?.map((question: Question, index: number) => {
            const answer      = (selectedSubmission.answers as Record<string, string>)?.[question.id];
            const aiResult    = aiResults[question.id];
            const correctAnswer = ('correct_answer' in question) ? (question as any).correct_answer as string : undefined;
            const autoCorrect = correctAnswer !== undefined && answer === correctAnswer;
            const isCorrect   = question.id in manualOverrides ? manualOverrides[question.id] : autoCorrect;
            const hasCorrect  = correctAnswer !== undefined;
            const wasOverridden = question.id in manualOverrides;

            return (
              <div key={question.id} className="py-4">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 w-5 text-right flex-shrink-0">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-snug">{question.question}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">{question.points} оноо</span>
                        {hasCorrect && answer && (
                          <button
                            onClick={() => setManualOverrides(prev => ({ ...prev, [question.id]: !isCorrect }))}
                            className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                              isCorrect
                                ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                                : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                            }`}
                          >
                            {isCorrect ? 'Зөв' : 'Буруу'}{wasOverridden ? ' ✎' : ''}
                          </button>
                        )}
                      </div>
                    </div>

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
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-sm">
                          <span className="text-neutral-400 dark:text-neutral-500">Хариулт: </span>
                          {answer
                            ? <span className={hasCorrect ? (isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400') : 'text-neutral-800 dark:text-neutral-200'}>{answer}</span>
                            : <span className="text-neutral-300 dark:text-neutral-600 italic">Хариулаагүй</span>}
                        </p>
                        {correctAnswer && (
                          <p className="text-sm">
                            <span className="text-neutral-400 dark:text-neutral-500">Зөв: </span>
                            <span className="text-neutral-700 dark:text-neutral-300 font-medium">{correctAnswer}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Essay AI detection */}
                    {question.type === 'essay' && answer && (
                      <div className="mt-3">
                        {!aiResult ? (
                          <button
                            onClick={() => handleCheckAI(question.id, answer)}
                            disabled={checkingAI === question.id}
                            className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-50 transition-colors"
                          >
                            {checkingAI === question.id
                              ? <><Loader2 size={12} className="animate-spin" />Шинжилж байна...</>
                              : <><Sparkles size={12} />AI шалгах</>}
                          </button>
                        ) : (
                          <div className="mt-2 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {aiResult.verdict === 'AI'
                                  ? <><ShieldAlert size={14} className="text-red-500" /><span className="text-sm font-medium text-red-700 dark:text-red-400">AI бичсэн ({aiResult.confidence}%)</span></>
                                  : aiResult.verdict === 'UNCERTAIN'
                                    ? <><AlertTriangle size={14} className="text-amber-500" /><span className="text-sm font-medium text-amber-700 dark:text-amber-400">Тодорхойгүй</span></>
                                    : <><ShieldCheck size={14} className="text-green-500" /><span className="text-sm font-medium text-green-700 dark:text-green-400">Хүний бичсэн ({aiResult.confidence}%)</span></>}
                              </div>
                              <button onClick={() => setAiResults(prev => { const n = { ...prev }; delete n[question.id]; return n; })}
                                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">Арилгах</button>
                            </div>
                            <div className="h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-2">
                              <div className={`h-full rounded-full ${aiResult.confidence >= 70 ? 'bg-red-500' : aiResult.confidence >= 40 ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${aiResult.confidence}%` }} />
                            </div>
                            {aiResult.reasoning && (
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{aiResult.reasoning}</p>
                            )}
                            <p className="text-xs text-neutral-400 mt-2">Эцсийн шийдвэрийг багш гаргана</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── LEVEL 2: Student list ─────────────────────────────────────────────────────
  if (selectedExam) {
    const examSubs = getExamSubs(selectedExam.id);
    const stats    = calcStats(selectedExam.id);
    const passing  = selectedExam.passing_score || 70;

    const summaryParts = [
      `${stats?.total ?? 0} оюутан`,
      stats?.scored && `дундаж ${stats.avg.toFixed(0)}%`,
      stats?.scored && `${stats.passCount}/${stats.scored} тэнцсэн`,
      stats?.cheats && `${stats.cheats} хуурсан`,
      stats?.pending && `${stats.pending} хүлээгдэж байна`,
    ].filter(Boolean).join(' · ');

    return (
      <div className="max-w-3xl">
        <nav className="flex items-center gap-1.5 text-xs text-neutral-400 mb-6">
          <button onClick={() => setSelectedExam(null)} className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">Үр дүн</button>
          <ChevronRight size={12} />
          <span className="text-neutral-600 dark:text-neutral-400">{selectedExam.title}</span>
        </nav>

        <div className="mb-5">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-0.5">{selectedExam.title}</h2>
          <p className="text-sm text-neutral-400 dark:text-neutral-500">{summaryParts}</p>
        </div>

        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          {examSubs
            .slice()
            .sort((a, b) => (b.total_score ?? -1) - (a.total_score ?? -1))
            .map((sub, rank) => {
              const status  = getStatus(sub, passing);
              const name    = sub.student_full_name || sub.student_username;
              const idNum   = sub.student_id_number?.trim();
              const major   = sub.student_major?.trim();
              const cp      = (sub as any).copy_paste_count ?? 0;
              const fs      = (sub as any).fullscreen_exit_count ?? 0;

              const violations = [
                (sub.tab_switches ?? 0) > 0 && `${sub.tab_switches} tab`,
                cp > 0 && `${cp} cp`,
                fs > 0 && `${fs} fs`,
              ].filter(Boolean).join(' · ');

              return (
                <div key={sub.id} className="px-4 py-3 flex items-center gap-3 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <span className="text-xs text-neutral-300 dark:text-neutral-600 w-5 text-right flex-shrink-0 tabular-nums">{rank + 1}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{name}</p>
                      {idNum && idNum !== sub.student_username && (
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 flex-shrink-0 font-mono">{idNum}</span>
                      )}
                    </div>
                    {major && major !== 'Unknown' && (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{major}</p>
                    )}
                    {violations && (
                      <p className="text-xs text-amber-600 dark:text-amber-500">{violations}</p>
                    )}
                  </div>

                  <InlineScoreEditor submissionId={sub.id} currentScore={sub.total_score ?? null} onSave={handleSaveScore} />

                  <span className={`text-xs w-20 text-right flex-shrink-0 ${
                    status === 'passed'  ? 'text-green-600 dark:text-green-400' :
                    status === 'cheat'   ? 'text-red-500 dark:text-red-400' :
                    status === 'failed'  ? 'text-red-500 dark:text-red-400' :
                    'text-neutral-400'
                  }`}>
                    {status === 'passed' ? 'Тэнцсэн' : status === 'cheat' ? 'Хуурсан' : status === 'failed' ? 'Тэнцээгүй' : 'Хүлээгдэж байна'}
                  </span>

                  <button
                    onClick={() => setSelectedSubmission(sub)}
                    className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex-shrink-0 transition-colors"
                  >
                    Харах
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  // ── LEVEL 1: Exam list ────────────────────────────────────────────────────────
  const examsWithSubs = exams.filter(e => localSubs.some(s => s.exam_id === e.id));

  if (examsWithSubs.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-neutral-500 dark:text-neutral-400 font-medium mb-1">Үр дүн байхгүй байна</p>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">Оюутнууд шалгалт өгсний дараа харагдана</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Үр дүн</h2>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">{examsWithSubs.length} шалгалт · {localSubs.length} илгээлт</p>
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
        {examsWithSubs.map(exam => {
          const stats = calcStats(exam.id);
          if (!stats) return null;

          const meta = [
            `${stats.total} оюутан`,
            stats.scored > 0 && `дундаж ${stats.avg.toFixed(0)}%`,
            stats.scored > 0 && `${stats.passCount}/${stats.scored} тэнцсэн`,
            stats.cheats > 0 && `${stats.cheats} хуурсан`,
            stats.pending > 0 && `${stats.pending} хүлээгдэж байна`,
          ].filter(Boolean).join(' · ');

          return (
            <button
              key={exam.id}
              onClick={() => setSelectedExam(exam)}
              className="w-full text-left px-4 py-3.5 flex items-center gap-4 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors truncate">{exam.title}</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{meta}</p>
              </div>
              <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600 flex-shrink-0 group-hover:text-neutral-500 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
