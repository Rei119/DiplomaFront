'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff } from 'lucide-react';

export interface LookDownEvent {
  count: number;
  timestamp: number;
  clipBlob?: Blob;
}

interface CameraTrackerProps {
  enabled: boolean;
  onLookDown: (event: LookDownEvent) => void;
  framesToConfirm?: number;
}

const HEAD_THRESHOLD        = 0.61;   // Higher — requires more obvious head tilt
const CORNER_THRESHOLD      = 0.112;  // Higher — requires more significant gaze drop
const COOLDOWN_MS           = 5_000;
const POST_CLIP_MS          = 2_000;
const DECAY_RATE            = 2;

function computeHeadDown(lm: any[]): { headDown: boolean; headRatio: number } {
  const forehead  = lm[10];
  const chin      = lm[152];
  const nose      = lm[1];
  const faceH     = Math.abs(chin.y - forehead.y) || 0.001;
  const headRatio = Math.abs(nose.y - forehead.y) / faceH;
  return {
    headDown:  headRatio > HEAD_THRESHOLD,
    headRatio: Math.round(headRatio * 1000) / 1000,
  };
}

function computeGazeDown(lm: any[]): {
  gazeDown:    boolean;
  lidRatio:    number;
  cornerShift: number;
} {
  const nose    = lm[1];
  const lOuter  = lm[33];   const lInner = lm[133];
  const rOuter  = lm[362];  const rInner = lm[263];
  const eyeCornerY  = (lOuter.y + lInner.y + rOuter.y + rInner.y) / 4;
  const cornerShift = nose.y - eyeCornerY;

  // Lid drop — kept for display only; unreliable with glasses
  const lUpperCenter = lm[159]; const lLowerCenter = lm[145];
  const rUpperCenter = lm[386]; const rLowerCenter = lm[374];
  const lEyeH = Math.abs(lLowerCenter.y - lUpperCenter.y) || 0.001;
  const rEyeH = Math.abs(rLowerCenter.y - rUpperCenter.y) || 0.001;
  const lLid  = Math.abs(lm[160].y - lUpperCenter.y + lm[158].y - lUpperCenter.y) / (lEyeH * 2);
  const rLid  = Math.abs(lm[385].y - rUpperCenter.y + lm[387].y - rUpperCenter.y) / (rEyeH * 2);
  const lidRatio = (lLid + rLid) / 2;

  return {
    gazeDown:    cornerShift > CORNER_THRESHOLD,
    lidRatio:    Math.round(lidRatio     * 1000) / 1000,
    cornerShift: Math.round(cornerShift  * 1000) / 1000,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CameraTracker({
  enabled,
  onLookDown,
  framesToConfirm = 30,
}: CameraTrackerProps) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const faceMeshRef  = useRef<any>(null);
  const animFrameRef = useRef<number>(0);

  // Frame counter — reset to 0 after each violation fires
  const downFramesRef = useRef(0);
  // Timestamp of last fired violation — gate for cooldown
  const lastFiredRef  = useRef(0);
  const countRef      = useRef(0);

  const [displayCount, setDisplayCount] = useState(0);
  const [status, setStatus]             = useState<'loading' | 'active' | 'denied' | 'error'>('loading');
  const [minimized, setMinimized]       = useState(false);

  const recorderRef  = useRef<MediaRecorder | null>(null);
  const preBufferRef = useRef<Blob[]>([]);

  const onLookDownRef = useRef(onLookDown);
  useEffect(() => { onLookDownRef.current = onLookDown; }, [onLookDown]);

  const fireViolation = useCallback(() => {
    const now = Date.now();
    if (now - lastFiredRef.current < COOLDOWN_MS) return;
    lastFiredRef.current = now;

    // Reset frame counter immediately so it can re-arm after cooldown
    downFramesRef.current = 0;

    countRef.current += 1;
    setDisplayCount(countRef.current);

    if (recorderRef.current?.state === 'recording') {
      const preParts  = [...preBufferRef.current];
      const postParts: Blob[] = [];
      const orig = recorderRef.current.ondataavailable;
      recorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) postParts.push(e.data);
      };
      setTimeout(() => {
        if (recorderRef.current) recorderRef.current.ondataavailable = orig;
        onLookDownRef.current({
          count:     countRef.current,
          timestamp: now,
          clipBlob:  new Blob([...preParts, ...postParts], { type: 'video/webm' }),
        });
      }, POST_CLIP_MS);
    } else {
      onLookDownRef.current({ count: countRef.current, timestamp: now });
    }
  }, []);

  const analyzeResults = useCallback((results: any) => {
    const lm = results?.multiFaceLandmarks?.[0];
    if (!lm) {
      downFramesRef.current = 0;
      return;
    }

    const { headDown, headRatio }             = computeHeadDown(lm);
    const { gazeDown, lidRatio, cornerShift } = computeGazeDown(lm);

    // BOTH signals required: head must be down AND eyes must be looking down
    // This prevents false positives from leaning forward (just head position change)
    // while still catching actual look-downs
    if (headDown && gazeDown) {
      downFramesRef.current += 1;
    } else {
      downFramesRef.current = Math.max(0, downFramesRef.current - DECAY_RATE);
    }

    if (downFramesRef.current >= framesToConfirm) {
      fireViolation();
    }
  }, [framesToConfirm, fireViolation]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const boot = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Rolling 3-second pre-buffer (12 × 250 ms chunks)
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm')) {
          const mr = new MediaRecorder(stream, { mimeType: 'video/webm', videoBitsPerSecond: 200_000 });
          mr.ondataavailable = (e) => {
            if (e.data.size === 0) return;
            preBufferRef.current.push(e.data);
            if (preBufferRef.current.length > 12) preBufferRef.current.shift();
          };
          mr.start(250);
          recorderRef.current = mr;
        }

        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
        if (cancelled) return;

        const FaceMesh = (window as any).FaceMesh;
        if (!FaceMesh) { setStatus('error'); return; }

        const fm = new FaceMesh({
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
        });
        fm.setOptions({
          maxNumFaces:            1,
          refineLandmarks:        true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence:  0.5,
        });
        fm.onResults(analyzeResults);
        faceMeshRef.current = fm;

        const loop = async () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v && v.readyState >= 2) {
            try { await fm.send({ image: v }); } catch { /* ignore frame errors */ }
          }
          animFrameRef.current = requestAnimationFrame(loop);
        };
        loop();
        setStatus('active');
      } catch (err: any) {
        if (err.name === 'NotAllowedError') setStatus('denied');
        else { console.error(err); setStatus('error'); }
      }
    };

    boot();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      faceMeshRef.current = null;
    };
  }, [enabled, analyzeResults]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg border ${
            status === 'active'
              ? 'bg-green-600 text-white border-green-700'
              : 'bg-red-600 text-white border-red-700'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Камер {status === 'active' ? 'идэвхтэй' : 'алдаа'}
        </button>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden w-60">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Камер хяналт</span>
            </div>
            <button onClick={() => setMinimized(true)} className="text-neutral-400 hover:text-neutral-600 text-xs px-1">—</button>
          </div>

          {/* Video feed */}
          <div className="relative bg-black">
            <video ref={videoRef} className="w-full h-32 object-cover" muted playsInline />
            {status === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-1" />
                  <p className="text-white text-xs">Ачааллаж байна...</p>
                </div>
              </div>
            )}
            {status === 'denied' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center px-3">
                  <CameraOff className="w-6 h-6 text-red-400 mx-auto mb-1" />
                  <p className="text-white text-xs">Камерт зөвшөөрөл өгнө үү</p>
                </div>
              </div>
            )}
          </div>

          {/* Counter */}
          <div className="p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Доош харсан</span>
              <span className={`text-3xl font-bold px-3 py-2 rounded-lg ${
                displayCount === 0
                  ? 'text-neutral-400'
                  : displayCount < 3
                    ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30'
                    : 'text-red-600 bg-red-50 dark:bg-red-950/30'
              }`}>
                {displayCount}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.crossOrigin = 'anonymous';
    s.onload  = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}