'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Plus, FileText, Trash2, Edit2, Eye, EyeOff, X,
  ChevronUp, ChevronDown, Hash, Copy, Check,
  Upload, Scan, AlertCircle, Loader2, ImagePlus,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import ScienceInlinePicker from '@/components/common/ScienceInlinePicker';
import { examsAPI } from '@/lib/api/client';
import api from '@/lib/api/client';
import type { Exam, Question, QuestionType } from '@/types';

function generateExamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

interface ExamBuilderProps {
  onExamCreated?: () => void;
}

export function ExamBuilder({ onExamCreated }: ExamBuilderProps) {
  const [showForm, setShowForm] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const loadExams = async () => {
    setLoading(true);
    try {
      const response = await examsAPI.getAll();
      setExams(response.data || []);
    } catch { setExams([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadExams(); }, []);

  const handleCreateExam = () => { setEditingExam(null); setShowForm(true); };
  const handleEditExam = (exam: Exam) => { setEditingExam(exam); setShowForm(true); };
  const handleExamSaved = async () => {
    setShowForm(false); setEditingExam(null);
    await loadExams(); onExamCreated?.();
  };
  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Та энэ шалгалтыг устгахдаа итгэлтэй байна уу?')) return;
    try { await examsAPI.delete(examId); await loadExams(); onExamCreated?.(); }
    catch { alert('Шалгалт устгах амжилтгүй болсон'); }
  };
  const handleToggleStatus = async (exam: Exam) => {
    try {
      const newStatus = exam.status === 'draft' ? 'published' : 'draft';
      await examsAPI.update(exam.id, { ...exam, status: newStatus });
      await loadExams(); onExamCreated?.();
    } catch { alert('Статус солих амжилтгүй болсон'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="spinner w-6 h-6" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Шалгалтууд</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{exams.length} шалгалт</p>
        </div>
        <button onClick={handleCreateExam}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus size={15} />Шинэ шалгалт
        </button>
      </div>

      {showForm && (
        <DetailedExamForm
          exam={editingExam}
          onClose={() => { setShowForm(false); setEditingExam(null); }}
          onSubmit={handleExamSaved}
        />
      )}

      {exams.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-12 text-center">
          <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center mx-auto mb-3">
            <FileText className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
          </div>
          <p className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Шалгалт байхгүй байна</p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4">Эхний шалгалтаа үүсгэж оюутнуудад илгээх</p>
          <button onClick={handleCreateExam}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus size={14} />Шинэ шалгалт үүсгэх
          </button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <ExamCard key={exam.id} exam={exam}
              onEdit={() => handleEditExam(exam)}
              onDelete={() => handleDeleteExam(exam.id)}
              onToggleStatus={() => handleToggleStatus(exam)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExamCard({ exam, onEdit, onDelete, onToggleStatus }: {
  exam: Exam; onEdit: () => void; onDelete: () => void; onToggleStatus: () => void;
}) {
  const isPublished = exam.status === 'published';
  const code = (exam as any).exam_code;
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all overflow-hidden group">
      <div className={`h-1 w-full ${isPublished ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm leading-snug line-clamp-2 mb-1">
              {exam.title}
            </h3>
            {exam.description && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 line-clamp-1">{exam.description}</p>
            )}
          </div>
          <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
            isPublished
              ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-primary-500' : 'bg-neutral-400'}`} />
            {isPublished ? 'Нийтлэгдсэн' : 'Ноорог'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 mb-3">
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3"><path d="M1 11V3a1 1 0 011-1h10a1 1 0 011 1v8M4 7h2M4 9.5h6M4 5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {exam.questions?.length || 0} асуулт
          </span>
          <span className="text-neutral-300 dark:text-neutral-600">·</span>
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {(exam as any).duration_minutes || exam.time_limit} мин
          </span>
          <span className="text-neutral-300 dark:text-neutral-600">·</span>
          <span className={(exam as any).auto_fail_on_cheat !== false ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
            {(exam as any).auto_fail_on_cheat !== false ? '🚫 Тэнцээгүй' : `➖ ${(exam as any).tab_switch_deduct_points || 5}п хасах`}
          </span>
        </div>

        {code && (
          <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg mb-3">
            <div className="flex items-center gap-1.5">
              <Hash size={11} className="text-neutral-400" />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Код</span>
            </div>
            <button onClick={handleCopy} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity" title="Хуулах">
              <span className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100 tracking-widest">{code}</span>
              {copied ? <Check size={12} className="text-primary-500" /> : <Copy size={12} className="text-neutral-400" />}
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors">
            <Edit2 size={13} />Засах
          </button>
          <button onClick={onToggleStatus}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              isPublished
                ? 'text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border-neutral-200 dark:border-neutral-700'
                : 'text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 dark:hover:bg-primary-950/60 border-primary-200 dark:border-primary-800'
            }`}>
            {isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
            {isPublished ? 'Буцаах' : 'Нийтлэх'}
          </button>
          <button onClick={onDelete}
            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-800 rounded-lg transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ExamScanner({ onQuestionsScanned, onClose }: {
  onQuestionsScanned: (questions: Question[]) => void; onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(f.type)) { setError('PDF, PNG, JPG, эсвэл WEBP файл оруулна уу'); return; }
    if (f.size > 20 * 1024 * 1024) { setError('Файлын хэмжээ 20MB-аас бага байх ёстой'); return; }
    setFile(f); setError('');
  };

  const handleScan = async () => {
    if (!file) return;
    setScanning(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/scan/exam', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { questions } = response.data;
      if (!questions || questions.length === 0) { setError('Асуулт олдсонгүй. Илүү тод зураг оруулж үзнэ үү.'); return; }
      onQuestionsScanned(questions);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Скан хийх амжилтгүй. Дахин оролдоно уу.');
    } finally { setScanning(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full shadow-xl">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100">PDF / Зураг скан хийх</h3>
            
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/30'
              : file ? 'border-primary-300 dark:border-primary-700 bg-primary-50/40 dark:bg-primary-950/20'
              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}>
            <input ref={fileInputRef} type="file" accept=".pdf,image/png,image/jpeg,image/jpg,image/webp" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file ? (
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{file.name}</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <Upload className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Файл чирж оруулах эсвэл товших</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">PDF, PNG, JPG, WEBP — max 20MB</p>
              </div>
            )}
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          <div className="text-xs text-neutral-400 dark:text-neutral-500 space-y-1">
            <p>• Асуултын төрлийг автоматаар тодорхойлно</p>
            <p>• Монгол болон Англи хэлний шалгалт дэмждэг</p>
            <p>• Та оноог тохируулаад хадгална</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors">Цуцлах</button>
            <button onClick={handleScan} disabled={!file || scanning}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2">
              {scanning ? <><Loader2 size={14} className="animate-spin" />Скан хийж байна...</> : <><Scan size={14} />Скан хийх</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScanReview({ questions: initial, onImport, onClose }: {
  questions: Question[]; onImport: (questions: Question[]) => void; onClose: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>(initial);
  const typeLabels: Record<string, string> = {
    multiple_choice: 'Сонгох', true_false: 'Үнэн/Худал',
    short_answer: 'Богино хариулт', essay: 'Эссэ', code: 'Код',
  };
  const typeColors: Record<string, string> = {
    multiple_choice: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    true_false: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    short_answer: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    essay: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    code: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100">Скан хийсэн асуултууд</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{questions.length} асуулт</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {questions.map((q, index) => (
            <div key={q.id} className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 mt-0.5 w-5 flex-shrink-0">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeColors[q.type] || typeColors.short_answer}`}>
                    {typeLabels[q.type] || q.type}
                  </span>
                  {(q as any).correct_answer && (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">→ {(q as any).correct_answer}</span>
                  )}
                </div>
                <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">{q.question}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input type="number" value={q.points} min={1} max={100}
                  onChange={e => { const u = [...questions]; u[index] = { ...u[index], points: Number(e.target.value) }; setQuestions(u); }}
                  className="w-14 px-2 py-1 text-center text-sm font-bold border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500" />
                <span className="text-xs text-neutral-400 dark:text-neutral-500">оноо</span>
                <button onClick={() => setQuestions(questions.filter((_, i) => i !== index))}
                  className="p-1 text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-xl flex items-center justify-between flex-shrink-0">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Нийт: <span className="font-bold text-neutral-900 dark:text-neutral-100">{questions.reduce((s, q) => s + (q.points || 0), 0)} оноо</span>
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors">Цуцлах</button>
            <button onClick={() => onImport(questions)} disabled={questions.length === 0}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5">
              <Plus size={14} />{questions.length} асуулт нэмэх
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailedExamForm({ exam, onClose, onSubmit }: {
  exam: Exam | null; onClose: () => void; onSubmit: () => void;
}) {
  const [title, setTitle] = useState(exam?.title || '');
  const [description, setDescription] = useState(exam?.description || '');
  const [timeLimit, setTimeLimit] = useState(exam?.time_limit?.toString() || '');
  const [maxTabSwitches, setMaxTabSwitches] = useState((exam as any)?.max_tab_switches?.toString() || '3');
  const [tabSwitchAction, setTabSwitchAction] = useState<'fail' | 'deduct'>(
    (exam as any)?.auto_fail_on_cheat === false ? 'deduct' : 'fail'
  );
  const [deductPoints, setDeductPoints] = useState((exam as any)?.tab_switch_deduct_points?.toString() || '5');
  const [questions, setQuestions] = useState<Question[]>(exam?.questions || []);
  const [loading, setLoading] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedQuestions, setScannedQuestions] = useState<Question[] | null>(null);

  const handleAddQuestion = (question: Question) => {
    if (editingQuestionIndex !== null) {
      const updated = [...questions]; updated[editingQuestionIndex] = question; setQuestions(updated); setEditingQuestionIndex(null);
    } else { setQuestions([...questions, question]); }
    setShowQuestionForm(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { alert('Шалгалтын нэр оруулна уу'); return; }
    if (!timeLimit || Number(timeLimit) <= 0) { alert('Хугацаа оруулна уу'); return; }
    if (questions.length === 0) { alert('Наад зах нь 1 асуулт нэмнэ үү'); return; }
    setLoading(true);
    try {
      const examData = {
        title: title.trim(), description: description.trim(),
        time_limit: Number(timeLimit), passing_score: 0,
        max_tab_switches: Number(maxTabSwitches) || 3,
        auto_fail_on_cheat: tabSwitchAction === 'fail',
        tab_switch_deduct_points: tabSwitchAction === 'deduct' ? Number(deductPoints) || 5 : 0,
        questions,
        exam_code: (exam as any)?.exam_code || generateExamCode(),
      };
      if (exam) { await examsAPI.update(exam.id, examData); }
      else { await examsAPI.create(examData); }
      onSubmit();
    } catch { alert('Шалгалт хадгалах амжилтгүй'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-4xl w-full my-8 shadow-xl">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-neutral-900 dark:text-neutral-100">{exam ? 'Шалгалт засах' : 'Шинэ шалгалт үүсгэх'}</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{questions.length} асуулт нэмэгдсэн</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 max-h-[72vh] overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">Шалгалтын нэр <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="Дундын шалгалт" required />
            </div>
            <div>
              <label className="label">Тайлбар</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="input-field resize-none" rows={2} placeholder="Шалгалтын товч тайлбар" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Хугацаа (мин) <span className="text-red-500">*</span></label>
                <input type="number" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} className="input-field" placeholder="60" min="1" max="300" />
              </div>
              <div>
                <label className="label">Tab солих хязгаар</label>
                <input type="number" value={maxTabSwitches} onChange={e => setMaxTabSwitches(e.target.value)} className="input-field" placeholder="3" min="0" max="20" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="label">Tab хязгаар хэтрэхэд</label>
              <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTabSwitchAction('fail')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                    tabSwitchAction === 'fail'
                      ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                      : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                  }`}
                >
                  Тэнцээгүй болгох
                </button>
                <button
                  type="button"
                  onClick={() => setTabSwitchAction('deduct')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium border-l border-neutral-200 dark:border-neutral-700 transition-colors ${
                    tabSwitchAction === 'deduct'
                      ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                      : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                  }`}
                >
                  Оноо хасах
                </button>
              </div>
              {tabSwitchAction === 'deduct' && (
                <div className="flex items-center gap-2 pt-1">
                  <label className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">Tab солих бүрт хасах оноо:</label>
                  <input
                    type="number"
                    value={deductPoints}
                    onChange={e => setDeductPoints(e.target.value)}
                    className="input-field w-20"
                    min="1" max="50"
                  />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">оноо</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{questions.length} Асуулт</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowScanner(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-950/50 rounded-lg transition-colors">
                  <Scan size={13} />PDF скан
                </button>
                <button type="button" onClick={() => { setEditingQuestionIndex(null); setShowQuestionForm(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                  <Plus size={13} />Асуулт нэмэх
                </button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">Асуулт нэмэгдээгүй байна</p>
                <button type="button" onClick={() => setShowScanner(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg transition-colors">
                  <Scan size={13} />PDF-ээс скан хийх
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, index) => (
                  <QuestionPreview key={index} question={q} index={index}
                    onEdit={() => { setEditingQuestionIndex(index); setShowQuestionForm(true); }}
                    onDelete={() => { if (confirm('Асуулт устгах уу?')) setQuestions(questions.filter((_, i) => i !== index)); }}
                    onMoveUp={() => { const n=[...questions]; if(index>0){[n[index],n[index-1]]=[n[index-1],n[index]];setQuestions(n);} }}
                    onMoveDown={() => { const n=[...questions]; if(index<n.length-1){[n[index],n[index+1]]=[n[index+1],n[index]];setQuestions(n);} }}
                    canMoveUp={index > 0} canMoveDown={index < questions.length - 1} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-xl flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors">Цуцлах</button>
          <button onClick={handleSubmit} disabled={questions.length === 0 || loading}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" />Хадгалж байна...</> : (exam ? 'Хадгалах' : 'Үүсгэх')}
          </button>
        </div>

        {showQuestionForm && (
          <QuestionForm
            question={editingQuestionIndex !== null ? questions[editingQuestionIndex] : null}
            onClose={() => { setShowQuestionForm(false); setEditingQuestionIndex(null); }}
            onSubmit={handleAddQuestion} />
        )}
      </div>

      {showScanner && (
        <ExamScanner onQuestionsScanned={q => { setShowScanner(false); setScannedQuestions(q); }} onClose={() => setShowScanner(false)} />
      )}
      {scannedQuestions && (
        <ScanReview questions={scannedQuestions}
          onImport={imported => { setQuestions(prev => [...prev, ...imported]); setScannedQuestions(null); }}
          onClose={() => setScannedQuestions(null)} />
      )}
    </div>
  );
}

function QuestionPreview({ question, index, onEdit, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: {
  question: Question; index: number; onEdit: () => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void; canMoveUp: boolean; canMoveDown: boolean;
}) {
  const typeLabels: Record<QuestionType, string> = {
    multiple_choice: 'Сонгох', true_false: 'Үнэн/Худал',
    short_answer: 'Богино хариулт', essay: 'Эссэ', code: 'Код',
  };
  const typeColors: Record<QuestionType, string> = {
    multiple_choice: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    true_false: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    short_answer: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    essay: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    code: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors group">
      <div className="flex flex-col gap-0.5">
        <button onClick={onMoveUp} disabled={!canMoveUp} className="p-0.5 text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-20 transition-colors"><ChevronUp size={14} /></button>
        <button onClick={onMoveDown} disabled={!canMoveDown} className="p-0.5 text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-20 transition-colors"><ChevronDown size={14} /></button>
      </div>
      <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 w-5 flex-shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeColors[question.type]}`}>{typeLabels[question.type]}</span>
          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{question.points}п</span>
        </div>
        <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{question.question}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded transition-colors"><Edit2 size={13} /></button>
        <button onClick={onDelete} className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

function QuestionForm({ question, onClose, onSubmit }: {
  question: Question | null; onClose: () => void; onSubmit: (question: Question) => void;
}) {
  const [type, setType] = useState<QuestionType>(question?.type || 'multiple_choice');
  const [questionText, setQuestionText] = useState(question?.question || '');
  const [points, setPoints] = useState(question?.points?.toString() || '');
  const [options, setOptions] = useState<string[]>(question?.type === 'multiple_choice' ? question.options || ['','','',''] : ['','','','']);
  const [correctAnswer, setCorrectAnswer] = useState(question?.type === 'multiple_choice' ? (question.correct_answer || '') : '');
  const [trueFalseAnswer, setTrueFalseAnswer] = useState(question?.type === 'true_false' ? (question.correct_answer || 'true') : 'true');
  const [shortAnswer, setShortAnswer] = useState(question?.type === 'short_answer' ? (question.correct_answer || '') : '');
  const [minWords, setMinWords] = useState(question?.type === 'essay' ? (question.min_words?.toString() || '100') : '100');
  const [language, setLanguage] = useState<string>(question?.type === 'code' ? (question.language || 'python') : 'python');
  const [starterCode, setStarterCode] = useState(question?.type === 'code' ? (question.starter_code || '') : '');
  const [imageUrl, setImageUrl] = useState<string>((question as any)?.image_url || '');
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageUploading(true);
    try {
      const token = sessionStorage.getItem('token');
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/questions/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setImageUrl(data.url);
    } catch {
      alert('Зураг байршуулах амжилтгүй');
    } finally {
      setImageUploading(false);
    }
  };

  // Science keyboard
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef(0);
  const hasLatex = /[_^\\$]/.test(questionText);

  const insertLatex = (latex: string) => {
    const pos = cursorPosRef.current;
    const before = questionText.slice(0, pos);
    const after = questionText.slice(pos);
    const newText = before + latex + after;
    setQuestionText(newText);
    const newPos = pos + latex.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
        cursorPosRef.current = newPos;
      }
    }, 0);
  };

  const trackCursor = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    cursorPosRef.current = e.currentTarget.selectionStart ?? 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) { alert('Асуултын текст оруулна уу'); return; }
    if (!points || Number(points) <= 0) { alert('Оноо оруулна уу'); return; }
    let data: any = { id: question?.id || `q${Date.now()}`, type, question: questionText.trim(), points: Number(points), ...(imageUrl ? { image_url: imageUrl } : {}) };
    if (type === 'multiple_choice') {
      const valid = options.filter(o => o.trim());
      if (valid.length < 2) { alert('Наад зах нь 2 сонголт оруулна уу'); return; }
      if (!correctAnswer.trim()) { alert('Зөв хариулт сонгоно уу'); return; }
      data = { ...data, options: valid, correct_answer: correctAnswer };
    } else if (type === 'true_false') {
      data = { ...data, correct_answer: trueFalseAnswer };
    } else if (type === 'short_answer') {
      if (!shortAnswer.trim()) { alert('Зөв хариулт оруулна уу'); return; }
      data = { ...data, correct_answer: shortAnswer.trim() };
    } else if (type === 'essay') {
      data = { ...data, min_words: Number(minWords) || 100 };
    } else if (type === 'code') {
      data = { ...data, language, starter_code: starterCode };
    }
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 dark:text-neutral-100">{question ? 'Асуулт засах' : 'Шинэ асуулт нэмэх'}</h3>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Асуултын төрөл</label>
              <select value={type} onChange={e => setType(e.target.value as QuestionType)} className="input-field">
                <option value="multiple_choice">Сонгох</option>
                <option value="true_false">Үнэн/Худал</option>
                <option value="short_answer">Богино хариулт</option>
                <option value="essay">Эссэ</option>
                <option value="code">Код</option>
              </select>
            </div>
            <div>
              <label className="label">Оноо <span className="text-red-500">*</span></label>
              <input type="number" value={points} onChange={e => setPoints(e.target.value)} className="input-field" placeholder="10" min="1" max="100" required />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0">Асуулт <span className="text-red-500">*</span></label>
              <ScienceInlinePicker onInsert={insertLatex} />
            </div>
            <textarea
              ref={textareaRef}
              value={questionText}
              onChange={e => { setQuestionText(e.target.value); trackCursor(e); }}
              onClick={trackCursor}
              onKeyUp={trackCursor}
              className="input-field resize-none"
              rows={3}
              placeholder="Асуултын текстийг энд бичнэ үү... (жишээ: H_2O, x^{2}+1=0)"
              required
            />
            {hasLatex && (
              <div className="mt-1.5 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-500 dark:text-neutral-400 font-mono break-all">
                <span className="text-neutral-400 dark:text-neutral-500 mr-1">LaTeX:</span>
                {questionText}
              </div>
            )}
          </div>

          {/* ── Image attachment ── */}
          <div>
            <label className="label">Зураг (заавал биш)</label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
            />
            {imageUrl ? (
              <div className="relative inline-block">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000'}${imageUrl}`}
                  alt="Асуултын зураг"
                  className="max-h-48 max-w-full rounded-lg border border-neutral-200 dark:border-neutral-700 object-contain"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow"
                  title="Зургийг устгах"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
                className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all disabled:opacity-50"
              >
                {imageUploading
                  ? <><Loader2 size={15} className="animate-spin" />Байршуулж байна...</>
                  : <><ImagePlus size={15} />Зураг нэмэх</>
                }
              </button>
            )}
          </div>

          {type === 'multiple_choice' && (
            <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div>
                <label className="label text-blue-900 dark:text-blue-300">Сонголтууд</label>
                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={opt} onChange={e => { const n=[...options]; n[i]=e.target.value; setOptions(n); }}
                        className="flex-1 px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-800 text-neutral-900 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder={`Сонголт ${i + 1}`} />
                      {options.length > 2 && (
                        <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))}
                          className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"><X size={15} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setOptions([...options, ''])}
                  className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700">+ Сонголт нэмэх</button>
              </div>
              <div>
                <label className="label text-blue-900 dark:text-blue-300">Зөв хариулт</label>
                <select value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-800 text-neutral-900 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400" required>
                  <option value="">Сонгох</option>
                  {options.filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          )}

          {type === 'true_false' && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl">
              <label className="label text-purple-900 dark:text-purple-300">Зөв хариулт</label>
              <div className="grid grid-cols-2 gap-2">
                {(['true','false'] as const).map(val => (
                  <button key={val} type="button" onClick={() => setTrueFalseAnswer(val)}
                    className={`py-3 rounded-lg text-sm font-semibold transition-all ${
                      trueFalseAnswer === val
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                    }`}>
                    {val === 'true' ? 'Үнэн' : 'Худал'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'short_answer' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <label className="label text-emerald-900 dark:text-emerald-300">Зөв хариулт</label>
              <input type="text" value={shortAnswer} onChange={e => setShortAnswer(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-emerald-200 dark:border-emerald-800 text-neutral-900 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="Зөв хариулт" required />
            </div>
          )}

          {type === 'essay' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <label className="label text-amber-900 dark:text-amber-300">Наад зах нь үгийн тоо</label>
              <input type="number" value={minWords} onChange={e => setMinWords(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-800 text-neutral-900 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                placeholder="100" min="10" max="1000" />
            </div>
          )}

          {type === 'code' && (
            <div className="space-y-3 p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
              <div>
                <label className="label">Програмчлалын хэл</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className="input-field">
                  <optgroup label="Web">
                    <option value="html">HTML/CSS/JS</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="php">PHP</option>
                  </optgroup>
                  <optgroup label="General Purpose">
                    <option value="python">Python 3</option>
                    <option value="java">Java</option>
                    <option value="csharp">C#</option>
                    <option value="kotlin">Kotlin</option>
                    <option value="swift">Swift</option>
                    <option value="go">Go</option>
                    <option value="ruby">Ruby</option>
                    <option value="rust">Rust</option>
                    <option value="r">R</option>
                  </optgroup>
                  <optgroup label="Systems">
                    <option value="cpp">C++</option>
                    <option value="c">C</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="label">Эхлэх код (заавал биш)</label>
                <textarea value={starterCode} onChange={e => setStarterCode(e.target.value)}
                  className="input-field font-mono text-sm resize-none" rows={5}
                  placeholder={"def function_name():\n    pass"} />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">Цуцлах</button>
            <button type="submit" className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">{question ? 'Хадгалах' : 'Нэмэх'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}