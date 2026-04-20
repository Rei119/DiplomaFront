'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, Code } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/lib/store/authStore';
import { submissionsAPI, examsAPI } from '@/lib/api/client';
import type { Submission, Exam, Question } from '@/types';

// Type guard helpers — narrows the Question union so we can safely read correct_answer
function hasCorrectAnswer(q: Question): q is Extract<Question, { correct_answer: string }> {
  return q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'short_answer';
}

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
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Үр дүн ачааллаж байна...</p>
        </div>
      </div>
    );
  }

  if (!submission || !exam) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="card text-center max-w-md">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Үр дүн олдсонгүй</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">Үр дүн устгагдсан эсвэл хандах эрхгүй байна</p>
          <Button onClick={() => router.push('/student/dashboard')}>Буцах</Button>
        </div>
      </div>
    );
  }

  const totalScore = submission.total_score ?? null;
  const hasScore = totalScore !== null;
  const isFailed = submission.status === 'failed';

  const correctCount = exam.questions.filter(
    (q: Question) => submission.individual_scores?.[q.id]?.is_correct === true,
  ).length;
  const wrongCount = exam.questions.filter(
    (q: Question) => submission.individual_scores?.[q.id]?.is_correct === false,
  ).length;
  const pendingCount = exam.questions.filter((q: Question) => {
    const s = submission.individual_scores?.[q.id];
    return !s || s.score === null || s.is_correct === null || s.is_correct === undefined;
  }).length;

  // Submission.answers is Record<string, string> per the type
  const getStudentAnswer = (qId: string): string =>
    (submission.answers as Record<string, string>)[qId] ?? '';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => router.push('/student/dashboard')} className="mb-4">
            Буцах
          </Button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">{exam.title}</h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Өгсөн: {new Date(submission.created_at).toLocaleString('mn-MN')}
              </p>
            </div>
            <div className="text-right">
              {isFailed && (
                <div className="mb-2">
                  <span className="badge badge-danger inline-flex items-center gap-1">
                    <XCircle size={14} />Хуурсан
                  </span>
                </div>
              )}
              {!hasScore && (
                <div className="mb-2">
                  <span className="badge badge-neutral inline-flex items-center gap-1">
                    <Clock size={14} />Хүлээгдэж байна
                  </span>
                </div>
              )}
              {hasScore && (
                <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {totalScore.toFixed(1)}%
                </div>
              )}
              {pendingCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  +{pendingCount} эссэ дүн хүлээгдэж байна
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Ерөнхий мэдээлэл</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Нийт асуулт</p>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{exam.questions.length}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Зөв хариулт</p>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{correctCount}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Буруу хариулт</p>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{wrongCount}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Хүлээгдэж буй</p>
              <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{pendingCount}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Tab солих</p>
              <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{submission.tab_switches || 0}</p>
            </div>
          </div>

          {hasScore && (
            <div className="mt-4">
              <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${Math.min(totalScore, 100)}%` }}
                />
              </div>
            </div>
          )}

          {isFailed && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800 dark:text-red-300">
                  <p className="font-medium">Шалгалт тэнцээгүй болсон шалтгаан:</p>
                  <p>Та 3+ удаа tab солих оролдлого хийсэн тул автоматаар тэнцээгүй болсон.</p>
                </div>
              </div>
            </div>
          )}

          {pendingCount > 0 && !isFailed && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium">Эссэ асуултууд хүлээгдэж байна</p>
                  <p>{pendingCount} эссэ асуултыг багш үнэлсний дараа эцсийн дүн гарна. Одоогийн дүн зөвхөн автоматаар шалгагдсан асуултуудын үр дүн юм.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Асуулт болон хариултууд</h2>

          {exam.questions.map((question: Question, index: number) => {
            const studentAnswer = getStudentAnswer(question.id);
            const scores = submission.individual_scores?.[question.id];
            const hasQuestionScore = scores !== undefined && scores !== null;

            const isEssay = question.type === 'essay';
            const isCode = question.type === 'code';
            const isPending = hasQuestionScore
              ? scores.is_correct === null || scores.is_correct === undefined || scores.score === null
              : isEssay;
            const isCorrect = scores?.is_correct;

            // Safely read correct_answer only for question types that have it
            const correctAnswer = hasCorrectAnswer(question) ? question.correct_answer : undefined;

            return (
              <div key={question.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Асуулт {index + 1}
                      </span>
                      <span className="badge badge-neutral">{question.type}</span>

                      {isPending ? (
                        <span className="badge badge-neutral inline-flex items-center gap-1">
                          <Clock size={12} />Багшийн үнэлгээ хүлээгдэж байна
                        </span>
                      ) : isCorrect === true ? (
                        <span className="badge badge-success inline-flex items-center gap-1">
                          <CheckCircle size={12} />{isCode ? 'Ажилласан' : 'Зөв'}
                        </span>
                      ) : isCorrect === false ? (
                        <span className="badge badge-danger inline-flex items-center gap-1">
                          <XCircle size={12} />Буруу
                        </span>
                      ) : null}
                    </div>
                    <p className="text-neutral-900 dark:text-neutral-100 font-medium">{question.question}</p>
                  </div>

                  <div className="text-right ml-4 flex-shrink-0">
                    {isPending ? (
                      <div>
                        <span className="text-lg font-semibold text-neutral-400 dark:text-neutral-500">—</span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">/{scores?.max_score ?? question.points} оноо</p>
                      </div>
                    ) : hasQuestionScore && scores.score !== null ? (
                      <div>
                        <span className={`text-lg font-semibold ${
                          (scores.score / scores.max_score) >= 0.7
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {scores.score} / {scores.max_score}
                        </span>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">оноо</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-lg font-semibold text-neutral-400">—</span>
                        <p className="text-xs text-neutral-500">/{question.points} оноо</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Student answer */}
                <div className="mb-3">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Таны хариулт:</p>
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                    {studentAnswer ? (
                      isCode ? (
                        <pre className="text-sm font-mono whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">{studentAnswer}</pre>
                      ) : (
                        <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">{studentAnswer}</p>
                      )
                    ) : (
                      <p className="text-sm text-neutral-400 dark:text-neutral-500 italic">Хариулаагүй</p>
                    )}
                  </div>
                </div>

                {/* Correct answer — only shown for wrong auto-graded non-code questions */}
                {!isPending && isCorrect === false && !isCode && correctAnswer && (
                  <div className="mb-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">Зөв хариулт:</p>
                    <p className="text-sm text-green-700 dark:text-green-300">{correctAnswer}</p>
                  </div>
                )}

                {/* Code ran successfully */}
                {isCode && isCorrect === true && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        Код амжилттай ажилласан. Багш нэмэлт оноо өгч болно.
                      </p>
                    </div>
                  </div>
                )}

                {/* Code did not run */}
                {isCode && isCorrect === false && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-800 dark:text-red-300">
                        Код ажиллаагүй эсвэл ажиллуулаагүй байна.
                      </p>
                    </div>
                  </div>
                )}

                {/* Essay pending */}
                {isPending && isEssay && (
                  <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Энэ асуултыг багш үнэлнэ. Үр дүн удахгүй гарна.
                      </p>
                    </div>
                  </div>
                )}

                {/* Teacher feedback */}
                {scores?.feedback && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Багшийн тайлбар:</p>
                    <p className="text-sm text-blue-800 dark:text-blue-300">{scores.feedback}</p>
                  </div>
                )}

                {/* AI detection */}
                {scores?.ai_detected && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-300">
                        <p className="font-medium">AI илрүүлэлт:</p>
                        <p>Энэ хариултад AI ашигласан байж болзошгүй ({scores.ai_confidence?.toFixed(1)}% итгэлтэй)</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push('/student/dashboard')}>
            Буцах
          </Button>
        </div>
      </main>
    </div>
  );
}