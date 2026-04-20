/**
 * useLookDownHandler
 *
 * Wires CameraTracker's onLookDown to:
 *   1. POST /api/submissions/:id/look-down  (increment count + save clip)
 *   2. Optionally call a local callback (e.g. show a banner)
 *
 * Usage:
 *   const handleLookDown = useLookDownHandler(submissionId, onWarning);
 *   <CameraTracker enabled onLookDown={handleLookDown} />
 */

import { useCallback } from 'react';

export type LookDownEvent = {
  count: number;
  timestamp: number;
  clipBlob?: Blob;
};

export function useLookDownHandler(
  submissionId: string | null,
  onWarning?: (count: number) => void,
) {
  return useCallback(async (event: LookDownEvent) => {
    // Local callback first (shows banner instantly, no network wait)
    onWarning?.(event.count);

    if (!submissionId) return;

    try {
      const formData = new FormData();
      formData.append('timestamp', String(event.timestamp));
      formData.append('count',     String(event.count));

      if (event.clipBlob) {
        // Filename encodes the timestamp so the backend can sort by time
        formData.append('clip', event.clipBlob, `clip_${event.timestamp}.webm`);
      }

      await fetch(`/api/submissions/${submissionId}/look-down`, {
        method: 'POST',
        body:   formData,
      });
    } catch (err) {
      // Non-critical — the count is already incremented client-side
      console.warn('Failed to upload look-down clip:', err);
    }
  }, [submissionId, onWarning]);
}