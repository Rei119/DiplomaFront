'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import {
  ArrowLeft, RefreshCw, Users, CheckCircle,
  AlertTriangle, Wifi, WifiOff, ChevronLeft, ChevronRight,
  VideoOff, MonitorOff,
} from 'lucide-react';

const PAGE_SIZE = 12;

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentCard {
  session_id: string;
  name: string;
  flag_count: number;
  flags: { type: string; timestamp: number }[];
  status: 'active' | 'submitted' | 'abandoned';
  tab_switches: number;
  copy_paste_count: number;
  fullscreen_exit_count: number;
  elapsed_ms: number;
  score: number | null;
  stream:   MediaStream | null;   // WebRTC live (best-effort, same network)
  frameUrl: string | null;        // canvas snapshot fallback (all networks)
}

interface LiveSession {
  session_id: string;
  username: string | null;
  full_name: string | null;
  student_id_number: string | null;
  student_major: string | null;
  started_at: number;
  last_heartbeat: number;
  elapsed_ms: number;
  tab_switches: number;
  copy_paste_count: number;
  fullscreen_exit_count: number;
  status: 'active' | 'submitted' | 'abandoned';
  score: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}ц ${m % 60}м`;
  if (m > 0) return `${m}м ${s % 60}с`;
  return `${s}с`;
}

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
}

function wsBase() {
  return apiBase().replace('/api', '').replace(/^http/, 'ws');
}

// ── Student video card ────────────────────────────────────────────────────────

function StudentVideoCard({ card }: { card: StudentCard }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (card.stream) { v.srcObject = card.stream; v.play().catch(() => {}); }
    else { v.srcObject = null; }
  }, [card.stream]);

  const flagColor =
    card.flag_count === 0 ? 'hidden' :
    card.flag_count >= 5  ? 'bg-red-500' : 'bg-amber-400';

  const statusDot =
    card.status === 'active'    ? 'bg-sky-400 animate-pulse' :
    card.status === 'submitted' ? 'bg-emerald-400' : 'bg-neutral-400';

  return (
    <div className={`relative rounded-xl overflow-hidden border transition-all duration-200 ${
      card.flag_count >= 3
        ? 'border-red-400 dark:border-red-600 shadow-red-200 dark:shadow-red-900 shadow-md'
        : 'border-neutral-200 dark:border-neutral-700'
    } bg-neutral-900`}>

      {/* Live stream (WebRTC) preferred; snapshot (WS relay) as fallback */}
      <div className="relative aspect-video bg-neutral-800 flex items-center justify-center">
        {card.stream ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : card.frameUrl ? (
          <img src={card.frameUrl} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-neutral-500">
            <VideoOff size={24} />
            <span className="text-xs">Камер байхгүй</span>
          </div>
        )}

        <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${statusDot}`} />

        {card.flag_count > 0 && (
          <div className={`absolute top-2 right-2 ${flagColor} text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight`}>
            ⚠ {card.flag_count}
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="px-3 py-2 bg-white dark:bg-neutral-900">
        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
          {card.name}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums">
            {fmt(card.elapsed_ms)}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
            {card.tab_switches > 0 && (
              <span className={`tabular-nums font-medium ${
                card.tab_switches >= 3 ? 'text-red-500' : 'text-amber-500'
              }`} title="Таб солилт">
                tab×{card.tab_switches}
              </span>
            )}
            {card.copy_paste_count > 0 && (
              <span className="tabular-nums font-medium text-orange-500" title="Хуулах/буулгах">
                cp×{card.copy_paste_count}
              </span>
            )}
            {card.fullscreen_exit_count > 0 && (
              <span className="tabular-nums font-medium text-purple-500" title="Бүтэн дэлгэц гарсан">
                fs×{card.fullscreen_exit_count}
              </span>
            )}
            {card.score !== null && (
              <span className={`font-semibold ${card.score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {card.score.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LiveMonitorPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [inputCode, setInputCode] = useState('');
  const [examCode, setExamCode]   = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [page, setPage]           = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [wsStatus, setWsStatus]   = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [wsDebug, setWsDebug]     = useState('');

  // student cards — keyed by session_id
  const [cards, setCards] = useState<Map<string, StudentCard>>(new Map());

  const wsRef   = useRef<WebSocket | null>(null);
  const pcsRef  = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── HTTP polling for session metadata ──────────────────────────────────────

  const pollSessions = useCallback(async (code: string) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${apiBase()}/sessions/by-code/${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setExamTitle(data.exam_title || '');
      setLastRefresh(new Date());

      setCards(prev => {
        const next = new Map(prev);
        (data.sessions as LiveSession[]).forEach(s => {
          const existing = next.get(s.session_id);
          next.set(s.session_id, {
            session_id:           s.session_id,
            name:                 s.full_name || s.username || '—',
            flag_count:           existing?.flag_count           ?? 0,
            flags:                existing?.flags                ?? [],
            stream:               existing?.stream               ?? null,
            frameUrl:             existing?.frameUrl             ?? null,
            status:               s.status,
            tab_switches:         s.tab_switches,
            copy_paste_count:     s.copy_paste_count             ?? 0,
            fullscreen_exit_count: s.fullscreen_exit_count       ?? 0,
            elapsed_ms:           s.elapsed_ms,
            score:                s.score,
          });
        });
        return next;
      });
    } catch {}
  }, []);

  // ── WebRTC: handle offer from student (simple trickle ICE, no TURN) ─────────

  const handleOffer = useCallback(async (session_id: string, sdp: RTCSessionDescriptionInit) => {
    const ws = wsRef.current;
    if (!ws) return;

    pcsRef.current.get(session_id)?.close();
    const pc = new RTCPeerConnection({ iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]});
    pcsRef.current.set(session_id, pc);

    pc.onicecandidate = (e) => {
      if (e.candidate && ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'ice', session_id, candidate: e.candidate }));
    };

    // Store track but only expose stream to UI once ICE is actually connected.
    // ontrack fires before ICE completes — showing the stream too early gives a
    // black video that hides the snapshot fallback.
    let pendingStream: MediaStream | null = null;
    pc.ontrack = (e) => {
      pendingStream = e.streams?.[0] ?? new MediaStream([e.track]);
    };
    pc.oniceconnectionstatechange = () => {
      if ((pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') && pendingStream) {
        const stream = pendingStream;
        setCards(prev => {
          const next = new Map(prev);
          const card = next.get(session_id);
          if (card) next.set(session_id, { ...card, stream });
          return next;
        });
      }
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        // ICE failed — clear stream so snapshot fallback shows
        setCards(prev => {
          const next = new Map(prev);
          const card = next.get(session_id);
          if (card) next.set(session_id, { ...card, stream: null });
          return next;
        });
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type: 'answer', session_id, sdp: pc.localDescription }));
  }, []);

  // ── Snapshot frame from student ───────────────────────────────────────────

  const handleFrame = useCallback((session_id: string, data: string) => {
    setCards(prev => {
      const next = new Map(prev);
      const card = next.get(session_id);
      if (card) next.set(session_id, { ...card, frameUrl: `data:image/jpeg;base64,${data}` });
      return next;
    });
  }, []);

  // ── Connect WebSocket + start monitoring ───────────────────────────────────

  const startMonitoring = useCallback(async (code: string) => {
    wsRef.current?.close();
    pcsRef.current.forEach(pc => pc.close());
    pcsRef.current.clear();
    setCards(new Map());
    setPage(0);

    const token = sessionStorage.getItem('token');
    setWsStatus('connecting');
    setWsDebug(`Connecting to ${wsBase()}/ws/monitor/${code}`);

    const ws = new WebSocket(`${wsBase()}/ws/monitor/${code}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      setWsDebug('');
      ws.send(JSON.stringify({ type: 'register', role: 'teacher' }));
    };
    ws.onerror = () => { setWsStatus('disconnected'); setWsDebug('WebSocket error'); };
    ws.onclose = (e) => { setWsStatus('disconnected'); setWsDebug(`Closed: ${e.code} ${e.reason || ''}`); };

    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);

      if (msg.type === 'students_list') {
        (msg.students as { session_id: string; name: string; flag_count: number; flags: any[] }[])
          .forEach(s => setCards(prev => {
            if (prev.has(s.session_id)) return prev;
            const next = new Map(prev);
            next.set(s.session_id, {
              session_id: s.session_id, name: s.name,
              flag_count: s.flag_count, flags: s.flags,
              stream: null, frameUrl: null,
              status: 'active', tab_switches: 0,
              copy_paste_count: 0, fullscreen_exit_count: 0,
              elapsed_ms: 0, score: null,
            });
            return next;
          }));
      }

      if (msg.type === 'student_joined') {
        setCards(prev => {
          if (prev.has(msg.session_id)) return prev;
          const next = new Map(prev);
          next.set(msg.session_id, {
            session_id: msg.session_id, name: msg.name,
            flag_count: 0, flags: [], stream: null, frameUrl: null,
            status: 'active', tab_switches: 0,
            copy_paste_count: 0, fullscreen_exit_count: 0,
            elapsed_ms: 0, score: null,
          });
          return next;
        });
      }

      if (msg.type === 'student_left') {
        pcsRef.current.get(msg.session_id)?.close();
        pcsRef.current.delete(msg.session_id);
        setCards(prev => {
          const next = new Map(prev);
          const card = next.get(msg.session_id);
          if (card) next.set(msg.session_id, { ...card, stream: null, frameUrl: null, status: 'abandoned' });
          return next;
        });
      }

      if (msg.type === 'offer')  await handleOffer(msg.session_id, msg.sdp);
      if (msg.type === 'frame')  handleFrame(msg.session_id, msg.data);

      if (msg.type === 'ice') {
        const pc = pcsRef.current.get(msg.session_id);
        if (pc?.remoteDescription && msg.candidate)
          try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
      }

      if (msg.type === 'flag') {
        setCards(prev => {
          const next = new Map(prev);
          const card = next.get(msg.session_id);
          if (card) {
            // Use msg.count (student's running total) as the authoritative value for each
            // type — this way duplicate messages (same count) don't inflate the display.
            const newTabSwitches  = msg.flag_type === 'tab_switch'       ? msg.count : card.tab_switches;
            const newCopyPaste    = msg.flag_type === 'copy_paste'        ? msg.count : card.copy_paste_count;
            const newFsExit       = msg.flag_type === 'fullscreen_exit'   ? msg.count : card.fullscreen_exit_count;
            next.set(msg.session_id, {
              ...card,
              flag_count:            newTabSwitches + newCopyPaste + newFsExit,
              flags:                 [...card.flags, { type: msg.flag_type, timestamp: msg.timestamp }],
              tab_switches:          newTabSwitches,
              copy_paste_count:      newCopyPaste,
              fullscreen_exit_count: newFsExit,
            });
          }
          return next;
        });
      }
    };

    if (pollRef.current) clearInterval(pollRef.current);
    await pollSessions(code);
    pollRef.current = setInterval(() => pollSessions(code), 10_000);
  }, [handleOffer, handleFrame, pollSessions]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      pcsRef.current.forEach(pc => pc.close());
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError('');
    setExamCode(code);
    try {
      // Start WS immediately — don't gate it behind HTTP
      await startMonitoring(code);
    } catch (err: any) {
      setError(err.message || 'Алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-semibold">Зөвхөн багш хандах эрхтэй</p>
      </div>
    );
  }

  // Pagination
  const allCards   = Array.from(cards.values());
  const active     = allCards.filter(c => c.status === 'active').length;
  const submitted  = allCards.filter(c => c.status === 'submitted').length;
  const abandoned  = allCards.filter(c => c.status === 'abandoned').length;
  const totalPages = Math.ceil(allCards.length / PAGE_SIZE);
  const pageCards  = allCards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">

      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/teacher/dashboard')}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              <ArrowLeft size={15} /> Буцах
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">/</span>
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Шууд хяналт</span>
            {examCode && (
              <>
                <span className="text-neutral-300 dark:text-neutral-700">/</span>
                <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400">{examCode}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* WS status pill */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              wsStatus === 'connected'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : wsStatus === 'connecting'
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500'
            }`}>
              {wsStatus === 'connected'
                ? <><Wifi size={11} className="animate-pulse" /> Холбогдсон</>
                : wsStatus === 'connecting'
                ? <><RefreshCw size={11} className="animate-spin" /> Холбогдож байна</>
                : <><WifiOff size={11} /> Тасарсан</>}
            </span>

            {wsDebug && wsStatus === 'disconnected' && (
              <span className="text-xs text-red-500 dark:text-red-400 max-w-[260px] truncate" title={wsDebug}>
                {wsDebug}
              </span>
            )}
            {lastRefresh && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8">

        {/* Code search */}
        {!examCode && (
          <div className="max-w-sm mb-8">
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">Шалгалтын шууд хяналт</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Шалгалтын кодоо оруулна уу. Оюутнуудын камер feed шууд харагдана.
            </p>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                placeholder="Жишээ: AB3X9"
                maxLength={8}
                className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono tracking-widest uppercase"
              />
              <button
                type="submit"
                disabled={loading || !inputCode.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? '...' : 'Эхлэх'}
              </button>
            </form>
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={13} /> {error}
              </p>
            )}
          </div>
        )}

        {examCode && (
          <>
            {/* Exam info + stats */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{examTitle}</h2>
                <p className="text-sm font-mono text-neutral-400 dark:text-neutral-500">{examCode}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <span className="text-sm font-bold text-sky-700 dark:text-sky-400">{active}</span>
                  <span className="text-xs text-sky-600 dark:text-sky-500">идэвхтэй</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg">
                  <CheckCircle size={12} className="text-emerald-500" />
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{submitted}</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-500">илгээсэн</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                  <MonitorOff size={12} className="text-neutral-400" />
                  <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">{abandoned}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">тасарсан</span>
                </div>
              </div>
            </div>

            {/* Camera grid */}
            {allCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl">
                <Users size={36} className="text-neutral-300 dark:text-neutral-600 mb-3" />
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Оюутан хүлээгдэж байна</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                  Шалгалтад орсон оюутнуудын камер энд харагдана
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-4">
                  {pageCards.map(card => (
                    <StudentVideoCard key={card.session_id} card={card} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-neutral-600 dark:text-neutral-300 tabular-nums">
                      {page + 1} / {totalPages}
                      <span className="text-neutral-400 dark:text-neutral-500 ml-2 text-xs">
                        ({allCards.length} оюутан)
                      </span>
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {/* Legend */}
                <div className="flex items-center gap-4 mt-5 text-xs text-neutral-400 dark:text-neutral-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" /> Хийж байна</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Илгээсэн</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-neutral-400" /> Тасарсан</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block px-1 bg-amber-400 rounded text-white text-[9px] font-bold">⚠</span> 1–4 тэмдэг</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block px-1 bg-red-500 rounded text-white text-[9px] font-bold">⚠</span> 5+ тэмдэг</span>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
