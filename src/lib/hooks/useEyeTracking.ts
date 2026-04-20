import { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

interface EyeTrackingResult {
  isLookingDown: boolean;
  lookDownCount: number;
  lookDownDuration: number; // seconds
}

export function useEyeTracking(enabled: boolean = true) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  
  const [isLookingDown, setIsLookingDown] = useState(false);
  const [lookDownCount, setLookDownCount] = useState(0);
  const [lookDownDuration, setLookDownDuration] = useState(0);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  
  const lookDownStartTime = useRef<number | null>(null);
  const lastLookingDown = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let animationFrame: number = 0;

    const initFaceMesh = async () => {
      try {
        // Initialize MediaPipe FaceMesh
        const faceMesh = new FaceMesh({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          },
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults(onResults);
        faceMeshRef.current = faceMesh;

        // Start webcam
        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (faceMeshRef.current && videoRef.current) {
                await faceMeshRef.current.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480,
          });
          
          await camera.start();
          cameraRef.current = camera;
          setIsWebcamActive(true);
        }
      } catch (error) {
        console.error('Eye tracking initialization failed:', error);
        alert('Камер ашиглах боломжгүй. Webcam-аа идэвхжүүлнэ үү.');
      }
    };

    const onResults = (results: any) => {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        return;
      }

      const landmarks = results.multiFaceLandmarks[0];
      const lookingDown = detectLookingDown(landmarks);
      
      setIsLookingDown(lookingDown);

      // Track looking down events
      if (lookingDown && !lastLookingDown.current) {
        // Just started looking down
        setLookDownCount(prev => prev + 1);
        lookDownStartTime.current = Date.now();
      } else if (!lookingDown && lastLookingDown.current) {
        // Just stopped looking down
        if (lookDownStartTime.current) {
          const duration = (Date.now() - lookDownStartTime.current) / 1000;
          setLookDownDuration(prev => prev + duration);
          lookDownStartTime.current = null;
        }
      }

      lastLookingDown.current = lookingDown;

      // Draw debug visualization
      if (canvasRef.current) {
        drawFaceLandmarks(canvasRef.current, landmarks, lookingDown);
      }
    };

    initFaceMesh();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [enabled]);

  return {
    videoRef,
    canvasRef,
    isLookingDown,
    lookDownCount,
    lookDownDuration,
    isWebcamActive,
  };
}

// Detect if user is looking down
function detectLookingDown(landmarks: any[]): boolean {
  // Key facial landmarks indices (MediaPipe Face Mesh)
  const nose = landmarks[1];           // Nose tip
  const leftEye = landmarks[33];       // Left eye corner
  const rightEye = landmarks[263];     // Right eye corner
  const chin = landmarks[152];         // Chin
  const forehead = landmarks[10];      // Forehead

  // Calculate vertical distances
  const eyeLevel = (leftEye.y + rightEye.y) / 2;
  const noseY = nose.y;
  const chinY = chin.y;
  const foreheadY = forehead.y;

  // Face height
  const faceHeight = chinY - foreheadY;

  // Nose position relative to eyes
  const noseToEyeDistance = noseY - eyeLevel;

  // Threshold: If nose is significantly below eye level
  // (indicates head tilted down)
  const lookDownThreshold = faceHeight * 0.15;

  return noseToEyeDistance > lookDownThreshold;
}

// Draw face landmarks for debugging
function drawFaceLandmarks(
  canvas: HTMLCanvasElement,
  landmarks: any[],
  isLookingDown: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = 640;
  canvas.height = 480;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw all landmarks
  ctx.fillStyle = isLookingDown ? '#ef4444' : '#22c55e';
  landmarks.forEach((landmark) => {
    ctx.beginPath();
    ctx.arc(
      landmark.x * canvas.width,
      landmark.y * canvas.height,
      2,
      0,
      2 * Math.PI
    );
    ctx.fill();
  });

  // Draw status text
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = isLookingDown ? '#ef4444' : '#22c55e';
  ctx.fillText(
    isLookingDown ? '⚠️ LOOKING DOWN' : '✓ LOOKING AT SCREEN',
    10,
    30
  );
}