'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, Clock, Send, Eye, User, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Timer } from '@/components/student/Timer';
import CodeCompiler from '@/components/student/CodeCompiler';
import ScienceKeyboard from '@/components/common/ScienceKeyboard';
import { MathText } from '@/components/common/LatexRenderer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const LANGUAGE_NAME_TO_ID: Record<string, number> = {
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

import { examsAPI, submissionsAPI } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/authStore';
import type { Exam, Question } from '@/types';

const MAJORS = [
  'Мэдээлэл, компьютерын ухаан', 'Програм хангамж',
  'Мэдээллийн технологи', 'Кибер аюулгүй байдал',
  'Мэдээллийн систем', 'Математик', 'Физик', 'Электроник', 'Бусад',
];

function needsScienceKeyboard(question: Question, studentMajor?: string): boolean {
  if (question.question?.includes('$')) return true;
  const scienceKeywords = ['томъёо', 'тэгшитгэл', 'урвал', 'хими', 'физик', 'молекул', 'атом', 'язгуур', 'интеграл', 'уламжлал'];
  const questionLower = question.question?.toLowerCase() || '';
  if (scienceKeywords.some(k => questionLower.includes(k))) return true;
  if (question.type === 'essay' && studentMajor) {
    if (['Математик', 'Физик'].some(m => studentMajor.includes(m))) return true;
  }
  return false;
}

interface StudentInfoFormProps {
  exam: Exam;
  onStart: (studentIdNumber: string, studentMajor: string) => void;
}

function StudentInfoForm({ exam, onStart }: StudentInfoFormProps) {
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [studentMajor, setStudentMajor] = useState('');
  const [customMajor, setCustomMajor] = useState('');
  const [errors, setErrors] = useState<{ id?: string; major?: string }>({});

  const validate = () => {
    const newErrors: { id?: string; major?: string } = {};
    if (!studentIdNumber.trim()) {
      newErrors.id = 'Оюутны дугаар оруулна уу';
    } else if (!/^[A-Z0-9]{4,20}$/i.test(studentIdNumber.trim())) {
      newErrors.id = 'Зөв формат оруулна уу (жишээ: 22B1NUM0002)';
    }
    const finalMajor = studentMajor === 'Бусад' ? customMajor : studentMajor;
    if (!finalMajor.trim()) newErrors.major = 'Мэргэжил сонгоно уу';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStart = () => {
    if (!validate()) return;
    const finalMajor = studentMajor === 'Бусад' ? customMajor.trim() : studentMajor;
    onStart(studentIdNumber.trim().toUpperCase(), finalMajor);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-neutral-900 dark:text-neutral-100 text-base">{exam.title}</h2>
              {exam.description && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{exam.description}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  `${(exam as any).time_limit || (exam as any).duration_minutes} минут`,
                  `${exam.questions?.length || 0} асуулт`,
                  `Тэнцэх: ${exam.passing_score}%`,
                ].map(l => (
                  <span key={l} className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md">{l}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">Оюутны мэдээлэл</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Шалгалт эхлэхийн өмнө мэдээллээ оруулна уу</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Оюутны дугаар <span className="text-red-500">*</span>
              </label>
              <input type="text" value={studentIdNumber} autoFocus
                onChange={e => { setStudentIdNumber(e.target.value.toUpperCase()); setErrors(p => ({ ...p, id: undefined })); }}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                placeholder="22B1NUM0002" maxLength={20}
                className={`w-full px-4 py-3 border-2 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all uppercase ${errors.id ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 text-neutral-900 dark:text-neutral-100' : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:border-primary-400'}`} />
              {errors.id
                ? <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.id}</p>
                : <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Жишээ: 22B1NUM0002, 21B2CS0045</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Мэргэжил <span className="text-red-500">*</span>
              </label>
              <select value={studentMajor}
                onChange={e => { setStudentMajor(e.target.value); setErrors(p => ({ ...p, major: undefined })); }}
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.major ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 text-neutral-900 dark:text-neutral-100' : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:border-primary-400'}`}>
                <option value="">Мэргэжил сонгоно уу...</option>
                {MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {studentMajor === 'Бусад' && (
                <input type="text" value={customMajor} onChange={e => setCustomMajor(e.target.value)}
                  placeholder="Мэргэжлээ бичнэ үү"
                  className="w-full px-4 py-3 border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2" />
              )}
              {errors.major && <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.major}</p>}
            </div>
          </div>

          <div className="mt-5 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-2">Шалгалтын дүрэм:</p>
            <div className="space-y-1.5">
              {[
                `Tab солих хязгаар: ${(exam as any).max_tab_switches ?? 3} удаа`,
                'Хуулах, буулгах хориотой',
                'Бүтэн дэлгэц горим шаардлагатай',
                'Камераар нүүрний хөдөлгөөн хянагдана',
                'Хугацаа дуусмагц автоматаар илгээгдэнэ',
              ].map(rule => (
                <p key={rule} className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />{rule}
                </p>
              ))}
            </div>
          </div>

          <button onClick={handleStart}
            className="w-full mt-5 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
            Шалгалт эхлүүлэх <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TakeExam() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [codeRanOk, setCodeRanOk] = useState<Record<string, boolean>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [showInfoForm, setShowInfoForm] = useState(true);
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [studentMajor, setStudentMajor] = useState('');
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const tabSwitchRef = useRef(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const submittingRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  // Anti-cheat counters (refs so they survive re-renders without causing them)
  const lastTabSwitchTimeRef = useRef(0);   // debounce blur+visibilitychange double-fire
  const copyPasteRef = useRef(0);
  const fullscreenExitRef = useRef(0);
  const wasFullscreenRef = useRef(false);   // true once student has entered fullscreen
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null); // reused for snapshots

  // Live monitor: WebSocket + canvas-snapshot + WebRTC refs
  const monitorWsRef     = useRef<WebSocket | null>(null);
  const monitorStream    = useRef<MediaStream | null>(null);
  const cameraVideoRef   = useRef<HTMLVideoElement | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const monitorPcRef     = useRef<RTCPeerConnection | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => { loadExam(); }, [params.examId]);

  useEffect(() => {
    if (!examStarted) return;
    const trackCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      copyPasteRef.current += 1;
      const ws = monitorWsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'flag', flag_type: 'copy_paste', count: copyPasteRef.current, timestamp: Date.now() }));
      }
      showTemporaryWarning('Хуулах, буулгах хориотой!');
    };
    const preventContextMenu = (e: MouseEvent) => { e.preventDefault(); showTemporaryWarning('Баруун товч хориотой!'); };
    document.addEventListener('copy', trackCopyPaste);
    document.addEventListener('cut', trackCopyPaste);
    document.addEventListener('paste', trackCopyPaste);
    document.addEventListener('contextmenu', preventContextMenu);
    return () => {
      document.removeEventListener('copy', trackCopyPaste);
      document.removeEventListener('cut', trackCopyPaste);
      document.removeEventListener('paste', trackCopyPaste);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [examStarted]);

  useEffect(() => {
    if (!examStarted || !exam) return;
    // visibilitychange is the correct API for tab/app switching on both desktop and mobile.
    // blur is intentionally NOT used — on mobile it fires for unrelated reasons (keyboard,
    // notification bar, address bar) and can fire seconds after visibilitychange, making
    // any debounce ineffective and causing double-counts.
    const onVisChange = () => { if (document.hidden) handleTabSwitch(); };
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [examStarted, exam]);

  useEffect(() => {
    if (!examStarted || !exam) return;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 0;
    if (isMobile) return;
    const isFullscreen = () =>
      !!(document.fullscreenElement
        || (document as any).webkitFullscreenElement
        || (document as any).mozFullScreenElement
        || (document as any).msFullscreenElement);
    const checkFS = () => {
      // Don't count the fullscreen exit that happens automatically on submission/navigation
      if (submittingRef.current) return;
      if (isFullscreen()) {
        wasFullscreenRef.current = true;
      } else {
        if (wasFullscreenRef.current) {
          wasFullscreenRef.current = false;
          fullscreenExitRef.current += 1;
          const ws = monitorWsRef.current;
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'flag', flag_type: 'fullscreen_exit', count: fullscreenExitRef.current, timestamp: Date.now() }));
          }
          showTemporaryWarning(`Анхааруулга: Бүтэн дэлгэцээс гарлаа! (${fullscreenExitRef.current} удаа)`);
        }
        setShowFullscreenPrompt(true);
      }
    };
    document.addEventListener('fullscreenchange', checkFS);
    document.addEventListener('webkitfullscreenchange', checkFS);
    document.addEventListener('mozfullscreenchange', checkFS);
    // Initial check — only show prompt, don't count as an exit
    const t = setTimeout(() => { if (!isFullscreen()) setShowFullscreenPrompt(true); }, 1000);
    return () => {
      document.removeEventListener('fullscreenchange', checkFS);
      document.removeEventListener('webkitfullscreenchange', checkFS);
      document.removeEventListener('mozfullscreenchange', checkFS);
      clearTimeout(t);
    };
  }, [examStarted, exam]);

  // Heartbeat: keep teacher's live view updated every 30s
  useEffect(() => {
    if (!examStarted) return;
    const interval = setInterval(async () => {
      if (!sessionIdRef.current || submittingRef.current) return;
      try {
        const token = sessionStorage.getItem('token');
        await fetch(`${API_BASE}/sessions/${sessionIdRef.current}/heartbeat`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            tab_switches: tabSwitchRef.current,
            copy_paste_count: copyPasteRef.current,
            fullscreen_exit_count: fullscreenExitRef.current,
          }),
        });
      } catch {}
    }, 30_000);
    return () => clearInterval(interval);
  }, [examStarted]);

  // ── Live monitor: canvas snapshots (always) + WebRTC (best-effort live) ─────
  useEffect(() => {
    if (!examStarted || !exam || !sessionIdRef.current) return;
    if (!exam.exam_code) return;

    const token   = sessionStorage.getItem('token');
    const apiBase = (process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000')
      .replace(/^http/, 'ws');
    const ws = new WebSocket(`${apiBase}/ws/monitor/${exam.exam_code}?token=${token}`);
    monitorWsRef.current = ws;

    // ── Acquire camera + start snapshot interval ──────────────────────────────
    // cameraVideoRef points to the VISIBLE camera widget — always decoded by the
    // browser because it's a real on-screen element with proper dimensions.
    const startCamera = async () => {
      try {
        let stream = monitorStream.current;
        if (!stream || stream.getTracks().every(t => t.readyState === 'ended')) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
            audio: false,
          });
          monitorStream.current = stream;
          setCameraStream(stream);   // triggers re-render → mounts visible video → ref set
        }

        // Restart automatically if the camera track ends mid-exam (revoked, hardware issue).
        stream.getTracks().forEach(track => {
          track.onended = () => {
            if (monitorStream.current !== stream) return; // already superseded
            if (!monitorWsRef.current || monitorWsRef.current.readyState !== WebSocket.OPEN) return;
            monitorStream.current = null;
            setCameraStream(null);
            setTimeout(startCamera, 1000);
          };
        });

        // Reuse one canvas across all snapshot ticks — avoid GC churn.
        if (!captureCanvasRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = 320; canvas.height = 240;
          captureCanvasRef.current = canvas;
        }

        // Snapshot interval — sends JPEG every 1.5 s regardless of WebRTC state.
        // cameraVideoRef.current is null until the React render after setCameraStream;
        // the guard inside the tick skips gracefully until it is available.
        if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = setInterval(() => {
          if (document.hidden || ws.readyState !== WebSocket.OPEN) return;
          const video = cameraVideoRef.current;
          // videoWidth === 0 means the browser hasn't decoded any frame yet.
          if (!video || video.readyState < 2 || video.videoWidth === 0) return;
          const canvas = captureCanvasRef.current!;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, 320, 240);
          const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          if (base64) ws.send(JSON.stringify({ type: 'frame', data: base64 }));
        }, 1500);

        // ── WebRTC offer (best-effort live video for same-network) ──────────
        startWebRTC(stream);
      } catch { /* camera denied — exam continues without monitoring */ }
    };

    // ── WebRTC offer with TURN relay for cross-network reliability ───────────
    const startWebRTC = async (stream: MediaStream) => {
      try {
        monitorPcRef.current?.close();
        const pc = new RTCPeerConnection({ iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
        ]});
        monitorPcRef.current = pc;

        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        pc.onicecandidate = (e) => {
          if (e.candidate && ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: 'ice', candidate: e.candidate }));
        };
        pc.oniceconnectionstatechange = () => {
          if ((pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected')
              && monitorPcRef.current === pc && ws.readyState === WebSocket.OPEN) {
            setTimeout(() => {
              const s = monitorStream.current;
              if (s) startWebRTC(s);
            }, 3000);
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription }));
      } catch { /* WebRTC not supported — snapshots still work */ }
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'register', role: 'student',
        session_id: sessionIdRef.current,
        name: user?.full_name || user?.username || 'Student',
      }));
      startCamera();
    };
    ws.onerror = () => {};
    ws.onclose = () => {};

    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'request_offer') {
        const s = monitorStream.current;
        if (s) startWebRTC(s);
      }
      if (msg.type === 'answer' && monitorPcRef.current) {
        try { await monitorPcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp)); } catch {}
      }
      if (msg.type === 'ice' && monitorPcRef.current?.remoteDescription) {
        try { await monitorPcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
      }
    };

    return () => {
      if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
      ws.close();
      monitorPcRef.current?.close(); monitorPcRef.current = null;
      monitorStream.current?.getTracks().forEach(t => { t.onended = null; t.stop(); });
      monitorWsRef.current = null; monitorStream.current = null;
      captureCanvasRef.current = null;
      // cameraVideoRef is now the React-managed visible widget — don't remove() it.
      cameraVideoRef.current = null;
      setCameraStream(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStarted, exam?.exam_code]);

  // Keep the visible camera widget in sync when the stream is set or cleared.
  // Runs after render, so cameraVideoRef.current is already attached to the DOM element.
  useEffect(() => {
    const vid = cameraVideoRef.current;
    if (!vid) return;
    vid.srcObject = cameraStream;
    if (cameraStream) vid.play().catch(() => {});
  }, [cameraStream]);

  const loadExam = async () => {
    try {
      setLoading(true);
      const response = await examsAPI.getById(params.examId as string);
      const examData = response.data;
      setExam(examData);
      setTimeLeft((examData.duration_minutes || examData.time_limit || 60) * 60);
    } catch {
      alert('Шалгалт ачаалах амжилтгүй');
      router.push('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleInfoSubmit = async (idNumber: string, major: string) => {
    setStudentIdNumber(idNumber);
    setStudentMajor(major);
    startTimeRef.current = Date.now();
    // Pre-request camera permission so the browser dialog doesn't trigger a tab-switch
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      s.getTracks().forEach(t => t.stop());
    } catch {}
    // Create session BEFORE starting exam so monitor WebSocket has session_id ready
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exam_id: exam?.id, student_id_number: idNumber, student_major: major }),
      });
      const data = await res.json();
      sessionIdRef.current = data.session_id ?? null;
    } catch {}
    setShowInfoForm(false);
    setExamStarted(true);
  };

  const handleTabSwitch = () => {
    if (submittingRef.current) return;
    // Both 'blur' and 'visibilitychange' fire on the same user action — dedupe within 500 ms.
    const now = Date.now();
    if (now - lastTabSwitchTimeRef.current < 500) return;
    lastTabSwitchTimeRef.current = now;
    tabSwitchRef.current += 1;
    const n = tabSwitchRef.current;
    // Real-time flag to teacher
    const ws = monitorWsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'flag', flag_type: 'tab_switch', count: n, timestamp: Date.now() }));
    }
    setTabSwitchCount(n);
    const max = exam?.max_tab_switches ?? 3;
    const autoFail = (exam as any)?.auto_fail_on_cheat !== false;
    const deductPts = (exam as any)?.tab_switch_deduct_points ?? 0;

    if (n >= max) {
      showTemporaryWarning(`${max} удаа таб солисон тул автоматаар тэнцээгүй!`);
      autoSubmit(true);
    } else {
      const pts = !autoFail && deductPts > 0 ? ` — ${deductPts} оноо хасагдлаа` : '';
      showTemporaryWarning(`Анхааруулга: Таб солилт ${n}/${max}. ${max - n} удаа үлдсэн${pts}!`);
    }
  };

  const showTemporaryWarning = (msg: string) => {
    setWarningMessage(msg);
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 4000);
  };

  const enterFullscreen = async () => {
    const el = document.documentElement as any;
    try {
      await (el.requestFullscreen?.()
        ?? el.webkitRequestFullscreen?.()
        ?? el.mozRequestFullScreen?.()
        ?? el.msRequestFullscreen?.());
      setShowFullscreenPrompt(false);
    } catch {
      // Browser blocked fullscreen (e.g. Firefox requires user gesture inside iframe)
      setShowFullscreenPrompt(false); // hide prompt so exam can still proceed
    }
  };

  const handleAnswerChange = (qId: string, answer: string | string[]) =>
    setAnswers(prev => ({ ...prev, [qId]: answer }));

  const handleCodeChange = (qId: string, code: string, ranOk: boolean) => {
    setAnswers(prev => ({ ...prev, [qId]: code }));
    setCodeRanOk(prev => ({ ...prev, [qId]: ranOk }));
  };

  const handleTimeUp = () => {
    showTemporaryWarning('Хугацаа дууссан! Автоматаар илгээж байна...');
    autoSubmit(false);
  };

  const buildPayload = () => {
    if (!exam) return null;

    // Build the Answer[] array the API expects
    const answersArray: { question_id: string; answer: string | string[] }[] =
      exam.questions.map((q: Question) => ({
        question_id: q.id,
        answer: answers[q.id] ?? '',
      }));

    // Append ran_ok flags for code questions as synthetic entries.
    // The backend reads answers dict by question_id, so "<qid>_ran_ok" = "true"/"false"
    // tells it whether the student successfully ran their code.
    exam.questions.forEach((q: Question) => {
      if (q.type === 'code') {
        answersArray.push({
          question_id: `${q.id}_ran_ok`,
          answer: codeRanOk[q.id] ? 'true' : 'false',
        });
      }
    });

    return {
      answers: answersArray,
      tab_switches: tabSwitchRef.current,
      copy_paste_count: copyPasteRef.current,
      fullscreen_exit_count: fullscreenExitRef.current,
      start_time: startTimeRef.current,
      student_id_number: studentIdNumber,
      student_major: studentMajor,
    };
  };

  const markSessionSubmitted = async (submissionId: string) => {
    if (!sessionIdRef.current) return;
    try {
      const token = sessionStorage.getItem('token');
      await fetch(`${API_BASE}/sessions/${sessionIdRef.current}/submit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ submission_id: submissionId }),
      });
    } catch {}
  };

  const autoSubmit = async (_failed: boolean) => {
    if (!exam || submittingRef.current) return;
    submittingRef.current = true;
    const payload = buildPayload();
    if (!payload) return;
    try {
      const r = await submissionsAPI.submit(exam.id, payload);
      await markSessionSubmitted(r.data.id);
      router.push(`/student/results/${r.data.id}`);
    } catch (e: any) {
      submittingRef.current = false;
      alert('Илгээх амжилтгүй: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleSubmit = async () => {
    if (!exam || submittingRef.current) return;
    const unanswered = exam.questions.filter((q: Question) => !answers[q.id]);
    if (unanswered.length > 0 && !confirm(`${unanswered.length} асуулт хариулаагүй байна. Илгээх үү?`)) return;
    submittingRef.current = true;
    setSubmitting(true);
    const payload = buildPayload();
    if (!payload) { submittingRef.current = false; setSubmitting(false); return; }
    try {
      const r = await submissionsAPI.submit(exam.id, payload);
      await markSessionSubmitted(r.data.id);
      submittingRef.current = false;
      setSubmitting(false);
      router.push(`/student/results/${r.data.id}`);
    } catch (e: any) {
      submittingRef.current = false;
      setSubmitting(false);
      alert('Илгээх амжилтгүй: ' + (e.response?.data?.detail || e.message));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center"><div className="spinner w-12 h-12 mb-4 mx-auto" /><p className="text-neutral-600">Ачааллаж байна...</p></div>
    </div>
  );

  if (!exam) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <p className="text-red-600 font-semibold">Шалгалт олдсонгүй</p>
    </div>
  );

  if (showInfoForm) return <StudentInfoForm exam={exam} onStart={handleInfoSubmit} />;

  const currentQuestion = exam.questions[currentQuestionIndex];
  const maxSwitches = exam.max_tab_switches ?? 3;

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto bg-stone-50 dark:bg-neutral-950">


      {showWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="font-semibold text-sm sm:text-base">{warningMessage}</p>
          </div>
        </div>
      )}

      {showFullscreenPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Eye className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Бүтэн дэлгэц шаардлагатай</h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6">Шалгалтыг үргэлжлүүлэхийн тулд бүтэн дэлгэц горимд орно уу</p>
            <Button variant="primary" fullWidth onClick={enterFullscreen} icon={Eye}>Бүтэн дэлгэц болгох</Button>
          </div>
        </div>
      )}

      {/* Camera widget — also the source element for snapshot captures (cameraVideoRef). */}
      {examStarted && (
        <div className="fixed bottom-4 right-4 z-40 w-36 rounded-xl overflow-hidden border border-neutral-300 dark:border-neutral-700 shadow-lg bg-neutral-900">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800">
            <div className={`w-1.5 h-1.5 rounded-full ${cameraStream ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-[10px] text-neutral-300 font-medium">Камер</span>
          </div>
          {cameraStream ? (
            <video
              autoPlay playsInline muted
              className="w-full h-24 object-cover"
              ref={cameraVideoRef}
            />
          ) : (
            <div className="w-full h-24 flex items-center justify-center text-neutral-500 text-xs">Холбогдож байна...</div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate">{exam.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-neutral-500">Асуулт {currentQuestionIndex + 1}/{exam.questions.length}</p>
                <span className="text-neutral-300 hidden sm:block">·</span>
                <p className="text-xs text-neutral-400 hidden sm:block truncate">{studentIdNumber} · {studentMajor}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {tabSwitchCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-xs font-medium text-red-700">{tabSwitchCount}/{maxSwitches}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 rounded-lg">
                <Clock className="w-4 h-4 text-neutral-600" />
                <Timer initialTime={timeLeft} onTimeUp={handleTimeUp} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`mx-auto px-4 sm:px-6 py-5 sm:py-8 transition-all duration-200 ${currentQuestion.type === 'code' ? 'max-w-[1400px]' : 'max-w-4xl'}`}>
        <div className={`bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm ${currentQuestion.type === 'code' ? 'p-4' : 'p-5 sm:p-8'}`}>
          <div className="mb-6">
            <div className="flex items-start justify-between mb-3 gap-3">
              <h2 className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">Асуулт {currentQuestionIndex + 1}</h2>
              <span className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs sm:text-sm font-semibold border border-primary-200 flex-shrink-0">
                {currentQuestion.points} оноо
              </span>
            </div>
            <div className="text-sm sm:text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed">
              <MathText>{currentQuestion.question}</MathText>
            </div>
            {(currentQuestion as any).image_url && (
              <div className="mt-4">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000'}${(currentQuestion as any).image_url}`}
                  alt="Асуултын зураг"
                  className="max-h-72 max-w-full rounded-xl border border-neutral-200 dark:border-neutral-700 object-contain"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            {currentQuestion.type === 'multiple_choice' && (
              <div className="space-y-2 sm:space-y-3">
                {currentQuestion.options?.map((option: string, index: number) => (
                  <label key={index} className="flex items-center gap-3 p-3 sm:p-4 border-2 border-neutral-200 dark:border-neutral-700 dark:hover:border-primary-700 rounded-xl hover:border-primary-300 hover:bg-primary-50/50 dark:bg-neutral-800 cursor-pointer transition-all">
                    <input type="radio" name={currentQuestion.id} value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={e => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="w-4 h-4 text-primary-600" />
                    <span className="flex-1 text-sm sm:text-base text-neutral-900 dark:text-neutral-100">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-3">
                {(['true', 'false'] as const).map(val => (
                  <button key={val} type="button" onClick={() => handleAnswerChange(currentQuestion.id, val)}
                    className={`p-4 sm:p-6 rounded-xl border-2 font-semibold transition-all text-sm sm:text-base ${
                      answers[currentQuestion.id] === val
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 hover:border-primary-300 text-neutral-700'
                    }`}>
                    {val === 'true' ? 'Үнэн' : 'Худал'}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'short_answer' && (
              <div>
                {needsScienceKeyboard(currentQuestion, studentMajor) ? (
                  <ScienceKeyboard
                    value={(answers[currentQuestion.id] as string) || ''}
                    onChange={value => handleAnswerChange(currentQuestion.id, value)}
                    placeholder="Томъёо ашиглан хариултаа бичнэ үү..."
                  />
                ) : (
                  <input type="text"
                    value={(answers[currentQuestion.id] as string) || ''}
                    onChange={e => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="w-full px-4 py-3 border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-lg"
                    placeholder="Хариултаа бичнэ үү..." />
                )}
              </div>
            )}

            {currentQuestion.type === 'essay' && (
              <div>
                {needsScienceKeyboard(currentQuestion, studentMajor) ? (
                  <ScienceKeyboard
                    value={(answers[currentQuestion.id] as string) || ''}
                    onChange={value => handleAnswerChange(currentQuestion.id, value)}
                    placeholder="Томъёо ашиглан эссэгээ бичнэ үү..."
                  />
                ) : (
                  <textarea
                    value={(answers[currentQuestion.id] as string) || ''}
                    onChange={e => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="w-full px-4 py-3 border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm sm:text-base"
                    rows={8} placeholder="Эссэгээ бичнэ үү..." />
                )}
                {currentQuestion.min_words && (
                  <p className="text-xs text-neutral-500 mt-2">Наад зах нь {currentQuestion.min_words} үг шаардлагатай</p>
                )}
              </div>
            )}

            {currentQuestion.type === 'code' && (
              <CodeCompiler
                initialCode={(answers[currentQuestion.id] as string) || currentQuestion.starter_code || ''}
                initialLanguageId={LANGUAGE_NAME_TO_ID[(currentQuestion.language || 'python').toLowerCase()] ?? 71}
                onCodeChange={(code, ranOk) => handleCodeChange(currentQuestion.id, code, ranOk)}
                examMode={true}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 sm:mt-8 gap-3">
          <Button variant="secondary" onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0}>
            Өмнөх
          </Button>
          <div className="flex-1 flex justify-center gap-1 sm:gap-2 flex-wrap">
            {exam.questions.map((_: Question, index: number) => (
              <button key={index} onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  index === currentQuestionIndex ? 'bg-primary-600 text-white'
                  : answers[exam.questions[index].id] ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                  : 'bg-neutral-100 text-neutral-600 border-2 border-neutral-300 hover:border-primary-300'
                }`}>{index + 1}</button>
            ))}
          </div>
          {currentQuestionIndex === exam.questions.length - 1 ? (
            <Button variant="primary" icon={Send} onClick={handleSubmit} loading={submitting}>Илгээх</Button>
          ) : (
            <Button variant="secondary" onClick={() => setCurrentQuestionIndex(p => Math.min(exam.questions.length - 1, p + 1))}>Дараах</Button>
          )}
        </div>
      </div>
    </div>
  );
}