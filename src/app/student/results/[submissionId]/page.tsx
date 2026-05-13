'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Code } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { submissionsAPI, examsAPI } from '@/lib/api/client';
import type { Submission, Exam, Question } from '@/types';

export default function ViewResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const submissionId = params.submissionId as string;
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'student') router.push('/login');
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (submissionId && isAuthenticated) loadData();
  }, [submissionId, isAuthenticated]);

  const loadData = async () => {
    try {
      const subResponse = await submissionsAPI.getById(submissionId);
      const subData = subResponse.data;
      const examResponse = await examsAPI.getById(subData.exam_id);
      setSubmission(subData);
      setExam(examResponse.data);
    } catch {
      alert('Үр дүн ачаалах амжилтгүй');
      router.push('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'student') return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!submission || !exam) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-500 mb-4">Үр дүн олдсонгүй</p>
          <button onClick={() => router.push('/student/dashboard')} className="text-sm text-neutral-900 dark:text-neutral-100 underline underline-offset-2">
            Буцах
          </button>
        </div>
      </div>
    );
  }

  const totalScore = submission.total_score ?? null;
  const hasScore = totalScore !== null;
  const isCheated = submission.status === 'failed';

  const correctCount = exam.questions.filter(
    (q: Question) => submission.individual_scores?.[q.id]?.is_correct === true,
  ).length;
  const pendingCount = exam.questions.filter((q: Question) => {
    const s = submission.individual_scores?.[q.id];
    return !s || s.score === null || s.is_correct === null || s.is_correct === undefined;
  }).length;

  const getStudentAnswer = (qId: string): string =>
    (submission.answers as Record<string, string>)[qId] ?? '';

  const violations = [
    (submission.tab_switches ?? 0) > 0 && `${submission.tab_switches} таб солилт`,
    ((submission as any).copy_paste_count ?? 0) > 0 && `${(submission as any).copy_paste_count} хуулах`,
    ((submission as any).fullscreen_exit_count ?? 0) > 0 && `${(submission as any).fullscreen_exit_count} дэлгэц гарсан`,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-2xl mx-auto px-5 py-8">

        {/* Back */}
        <button
          onClick={() => router.push('/student/dashboard')}
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mb-8 transition-colors"
        >
          <ArrowLeft size={15} /> Буцах
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-6 mb-8 pb-8 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1 leading-snug">
              {exam.title}
            </h1>
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              {new Date(submission.created_at).toLocaleString('mn-MN')}
            </p>
            {violations.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                {violations.join(' · ')}
              </p>
            )}
            {isCheated && (
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                Хуурлын шалтгаанаар автоматаар тэнцээгүй болсон
              </p>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            {hasScore ? (
              <>
                <div className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 leading-none">
                  {totalScore.toFixed(0)}<span className="text-xl text-neutral-400 font-normal">%</span>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {correctCount}/{exam.questions.length} зөв
                </p>
                {pendingCount > 0 && (
                  <p className="text-xs text-amber-500 mt-0.5">+{pendingCount} эссэ хүлээгдэж байна</p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                <Clock size={14} />
                Дүн хүлээгдэж байна
              </div>
            )}
          </div>
        </div>

        {/* Score bar */}
        {hasScore && (
          <div className="h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-8">
            <div
              className="h-full bg-neutral-900 dark:bg-neutral-100 rounded-full transition-all"
              style={{ width: `${Math.min(totalScore, 100)}%` }}
            />
          </div>
        )}

        {/* Questions */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {exam.questions.map((question: Question, index: number) => {
            const studentAnswer = getStudentAnswer(question.id);
            const scores = submission.individual_scores?.[question.id];
            const isEssay = question.type === 'essay';
            const isCode = question.type === 'code';
            const isPending = !scores || scores.score === null ||
              scores.is_correct === null || scores.is_correct === undefined;
            const isCorrect = scores?.is_correct;
            const correctAnswer = (scores as any)?.correct_answer as string | undefined;

            return (
              <div key={question.id} className="py-5">
                <div className="flex items-start gap-3">
                  {/* Status dot */}
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isPending
                      ? 'bg-neutral-100 dark:bg-neutral-800'
                      : isCorrect === true
                        ? 'bg-green-50 dark:bg-green-900/30'
                        : 'bg-red-50 dark:bg-red-900/30'
                  }`}>
                    {isPending
                      ? <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                      : isCorrect === true
                        ? <CheckCircle2 size={13} className="text-green-600 dark:text-green-400" />
                        : <XCircle size={13} className="text-red-500 dark:text-red-400" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2 leading-relaxed">
                      {index + 1}. {question.question}
                    </p>

                    <div className="space-y-1">
                      {/* Student answer */}
                      {studentAnswer ? (
                        isCode ? (
                          <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                            <Code size={12} />
                            <span>{isCorrect === true ? 'Код амжилттай ажилласан' : 'Код ажиллаагүй'}</span>
                          </div>
                        ) : (
                          <p className="text-sm">
                            <span className="text-neutral-400 dark:text-neutral-500">Хариулт: </span>
                            <span className={
                              isPending
                                ? 'text-neutral-700 dark:text-neutral-300'
                                : isCorrect === true
                                  ? 'text-green-700 dark:text-green-400 font-medium'
                                  : 'text-red-600 dark:text-red-400'
                            }>
                              {studentAnswer}
                            </span>
                          </p>
                        )
                      ) : (
                        <p className="text-sm text-neutral-400 dark:text-neutral-500 italic">Хариулаагүй</p>
                      )}

                      {/* Correct answer — shown when wrong */}
                      {!isPending && !isCode && isCorrect === false && correctAnswer && (
                        <p className="text-sm">
                          <span className="text-neutral-400 dark:text-neutral-500">Зөв: </span>
                          <span className="text-green-700 dark:text-green-400 font-medium">{correctAnswer}</span>
                        </p>
                      )}

                      {/* Essay pending */}
                      {isPending && isEssay && (
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mt-1">
                          <Clock size={11} /> Багш үнэлнэ
                        </p>
                      )}

                      {/* Teacher feedback */}
                      {scores?.feedback && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 rounded-lg px-3 py-2 mt-2">
                          {scores.feedback}
                        </p>
                      )}

                      {/* AI detection warning */}
                      {scores?.ai_detected && (
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                          AI агуулга илрүүлсэн ({scores.ai_confidence?.toFixed(0)}%)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0 ml-1 tabular-nums">
                    <span className={`text-sm font-semibold ${
                      isPending
                        ? 'text-neutral-400 dark:text-neutral-500'
                        : isCorrect === true
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}>
                      {isPending ? '—' : (scores?.score ?? 0)}
                    </span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      /{scores?.max_score ?? question.points}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Буцах
          </button>
        </div>
      </div>
    </div>
  );
}
