'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import {
  ArrowLeft, Users,
  ChevronLeft, ChevronRight,
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

function StudentVideoCard({ card, onClick }: { card: StudentCard; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (card.stream) { v.srcObject = card.stream; v.play().catch(() => {}); }
    else { v.srcObject = null; }
  }, [card.stream]);

  const highViolation = card.flag_count >= 3;

  return (
    <div
      onClick={onClick}
      className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer bg-neutral-900 ${
        highViolation ? 'ring-2 ring-red-500' : 'ring-1 ring-white/5'
      }`}
    >
      {card.stream ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      ) : card.frameUrl ? (
        <img src={card.frameUrl} className="w-full h-full object-cover" alt="" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-neutral-800">
          <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center">
            <span className="text-lg font-semibold text-neutral-400">{card.name[0]?.toUpperCase()}</span>
          </div>
          <span className="text-[10px] text-neutral-500">Камер байхгүй</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 pt-4 pb-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-white text-[11px] font-medium truncate leading-tight">{card.name}</span>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            card.status === 'active' ? 'bg-green-400 animate-pulse' :
            card.status === 'submitted' ? 'bg-green-400' : 'bg-neutral-500'
          }`} />
        </div>
        {(card.tab_switches > 0 || card.copy_paste_count > 0 || card.fullscreen_exit_count > 0) && (
          <div className="flex items-center gap-2 mt-0.5">
            {card.tab_switches > 0 && <span className="text-[9px] text-amber-300 font-medium">tab×{card.tab_switches}</span>}
            {card.copy_paste_count > 0 && <span className="text-[9px] text-orange-300 font-medium">cp×{card.copy_paste_count}</span>}
            {card.fullscreen_exit_count > 0 && <span className="text-[9px] text-purple-300 font-medium">fs×{card.fullscreen_exit_count}</span>}
          </div>
        )}
      </div>

      {card.status === 'submitted' && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <span className="text-white text-xs font-semibold bg-green-600/90 px-2.5 py-1 rounded-full">Илгээсэн {card.score !== null ? `· ${card.score.toFixed(0)}%` : ''}</span>
        </div>
      )}
    </div>
  );
}

// ── Expanded card modal ───────────────────────────────────────────────────────

function ExpandedCard({ card }: { card: StudentCard }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (card.stream) { v.srcObject = card.stream; v.play().catch(() => {}); }
    else { v.srcObject = null; }
  }, [card.stream]);

  return (
    <div className="w-full max-w-2xl aspect-video rounded-xl overflow-hidden bg-neutral-900">
      {card.stream ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      ) : card.frameUrl ? (
        <img src={card.frameUrl} className="w-full h-full object-cover" alt="" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-neutral-500 text-sm">Камер байхгүй</span>
        </div>
      )}
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
  const [, setLastRefresh] = useState<Date | null>(null);
  const [wsStatus, setWsStatus]   = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [, setWsDebug]     = useState('');
  const [selectedCard, setSelectedCard] = useState<StudentCard | null>(null);

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
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
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

  const allCards   = Array.from(cards.values());
  const active     = allCards.filter(c => c.status === 'active').length;
  const submitted  = allCards.filter(c => c.status === 'submitted').length;
  const totalPages = Math.ceil(allCards.length / PAGE_SIZE);
  const pageCards  = allCards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-5 h-12 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/teacher/dashboard')} className="text-neutral-400 hover:text-white transition-colors text-sm flex items-center gap-1.5">
            <ArrowLeft size={14} /> Буцах
          </button>
          {examCode && (
            <>
              <span className="text-white/20">/</span>
              <span className="text-sm font-mono text-neutral-300">{examCode}</span>
              {examTitle && <span className="text-sm text-neutral-400 hidden sm:block">— {examTitle}</span>}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {examCode && (
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span><span className="text-green-400 font-semibold">{active}</span> идэвхтэй</span>
              <span><span className="text-neutral-300 font-semibold">{submitted}</span> илгээсэн</span>
            </div>
          )}
          <span className={`flex items-center gap-1.5 text-xs ${
            wsStatus === 'connected' ? 'text-green-400' :
            wsStatus === 'connecting' ? 'text-amber-400' : 'text-neutral-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              wsStatus === 'connected' ? 'bg-green-400 animate-pulse' :
              wsStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-neutral-600'
            }`} />
            {wsStatus === 'connected' ? 'Холбогдсон' : wsStatus === 'connecting' ? 'Холбогдож байна' : 'Тасарсан'}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4">
        {!examCode ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-xs">
              <h1 className="text-xl font-bold text-white mb-1">Шууд хяналт</h1>
              <p className="text-sm text-neutral-400 mb-5">Шалгалтын кодыг оруулна уу</p>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.toUpperCase())}
                  placeholder="AB3X9"
                  maxLength={8}
                  className="flex-1 px-3 py-2 text-sm bg-neutral-800 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-white/30 font-mono tracking-widest uppercase placeholder:text-neutral-600"
                />
                <button type="submit" disabled={loading || !inputCode.trim()} className="px-4 py-2 bg-white text-neutral-900 text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-neutral-100 transition-colors">
                  {loading ? '...' : 'Нэвтрэх'}
                </button>
              </form>
              {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            </div>
          </div>
        ) : allCards.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <Users size={40} className="text-neutral-700" />
            <p className="text-neutral-400 text-sm">Оюутан хүлээгдэж байна...</p>
            <p className="text-neutral-600 text-xs">Оюутан шалгалтад орсон тэр даруй харагдана</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 mb-3">
              {pageCards.map(card => (
                <StudentVideoCard key={card.session_id} card={card} onClick={() => setSelectedCard(card)} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-neutral-400 tabular-nums">{page + 1} / {totalPages} · {allCards.length} оюутан</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {selectedCard && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={() => setSelectedCard(null)}>
          <div className="flex items-center justify-between px-5 h-12 border-b border-white/10">
            <span className="text-white font-medium text-sm">{selectedCard.name}</span>
            <div className="flex items-center gap-4 text-xs text-neutral-400">
              {selectedCard.tab_switches > 0 && <span className="text-amber-300">Tab: {selectedCard.tab_switches}</span>}
              {selectedCard.copy_paste_count > 0 && <span className="text-orange-300">CP: {selectedCard.copy_paste_count}</span>}
              {selectedCard.fullscreen_exit_count > 0 && <span className="text-purple-300">FS: {selectedCard.fullscreen_exit_count}</span>}
              <button onClick={() => setSelectedCard(null)} className="text-neutral-400 hover:text-white ml-2">✕</button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <ExpandedCard card={selectedCard} />
          </div>
        </div>
      )}
    </div>
  );
}
