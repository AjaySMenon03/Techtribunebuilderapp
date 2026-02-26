/**
 * Profile Editor – image preloader / cache.
 *
 * Keeps a Map of src → HTMLImageElement so the canvas renderer can
 * draw images synchronously after they've loaded.
 */

import { useRef, useCallback, useState } from 'react';

export function useImageCache() {
  const cache = useRef<Map<string, HTMLImageElement>>(new Map());
  // bump this counter to force a re-render when an image loads
  const [, setTick] = useState(0);

  const getImage = useCallback((src: string): HTMLImageElement | null => {
    if (!src) return null;
    const cached = cache.current.get(src);
    if (cached?.complete) return cached;

    if (!cached) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setTick((t) => t + 1);
      img.onerror = () => {
        // Remove broken entries so they can be retried
        cache.current.delete(src);
      };
      img.src = src;
      cache.current.set(src, img);
    }
    return null; // still loading
  }, []);

  const preload = useCallback((src: string) => {
    getImage(src);
  }, [getImage]);

  return { getImage, preload };
}
