'use client';

import { useEyeTracking } from '@/lib/hooks/useEyeTracking';
import { useEffect } from 'react';

interface EyeTrackerProps {
  enabled: boolean;
  onLookDown?: (count: number, duration: number) => void;
  maxLookDowns?: number;
}

export default function EyeTracker({ 
  enabled, 
  onLookDown,
  maxLookDowns = 10 
}: EyeTrackerProps) {
  const {
    videoRef,
    canvasRef,
    isLookingDown,
    lookDownCount,
    lookDownDuration,
    isWebcamActive,
  } = useEyeTracking(enabled);

  // Notify parent component
  useEffect(() => {
    if (onLookDown) {
      onLookDown(lookDownCount, lookDownDuration);
    }
  }, [lookDownCount, lookDownDuration, onLookDown]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Webcam feed - hidden in production, visible in debug */}
      <div className="relative">
        <video
          ref={videoRef}
          className="hidden" // Hide webcam feed from student
          autoPlay
          playsInline
        />
        
        {/* Debug canvas - shows face tracking (only for testing) */}
        <canvas
          ref={canvasRef}
          className="hidden" // Hide debug view in production
          width={640}
          height={480}
        />

        {/* Status indicator */}
        <div className={`
          absolute top-2 right-2 px-4 py-2 rounded-lg text-sm font-bold
          ${isLookingDown 
            ? 'bg-red-500 text-white' 
            : 'bg-green-500 text-white'}
        `}>
          {isWebcamActive ? (
            <>
              {isLookingDown ? '⚠️ Доош харж байна' : '✓ Дэлгэц харж байна'}
              <div className="text-xs mt-1">
                Доош харсан: {lookDownCount} удаа / {maxLookDowns}
              </div>
            </>
          ) : (
            '📹 Камер идэвхжүүлж байна...'
          )}
        </div>
      </div>

      {/* Warning if too many look-downs */}
      {lookDownCount >= maxLookDowns * 0.7 && (
        <div className="mt-2 bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm">
          ⚠️ Анхааруулга: Дэлгэц рүү харна уу!
        </div>
      )}
    </div>
  );
}