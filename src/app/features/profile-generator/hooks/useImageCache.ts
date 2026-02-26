/**
 * Profile Editor – image preloader / cache.
 *
 * Keeps a Map of src → HTMLImageElement so the canvas renderer can
 * draw images synchronously after they've loaded.
 *
 * Includes retry logic for failed loads (up to 3 attempts with backoff)
 * so that slow-loading Supabase signed URLs don't permanently break.
 */

import { useRef, useCallback, useState } from 'react';

interface CacheEntry {
  img: HTMLImageElement;
  retries: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 6000]; // ms

export function useImageCache() {
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  // bump this counter to force a re-render when an image loads
  const [, setTick] = useState(0);

  const getImage = useCallback((src: string): HTMLImageElement | null => {
    if (!src) return null;

    // Blob URLs are ephemeral — they only exist in the current browsing context.
    // A blob URL that is still valid (current session, not revoked) will load
    // instantly on the first attempt. A stale one (previous session / revoked)
    // will never load. We track which blob URLs are "known good" so we can
    // short-circuit stale ones without any console noise.
    const isBlobUrl = src.startsWith('blob:');

    const entry = cache.current.get(src);
    if (entry?.img.complete && entry.img.naturalWidth > 0) return entry.img;

    // If we already attempted a blob URL and it hasn't loaded, it's stale —
    // silently return null (no retry, no log).
    if (entry && isBlobUrl) return null;

    if (!entry) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const newEntry: CacheEntry = { img, retries: 0 };
      cache.current.set(src, newEntry);

      img.onload = () => setTick((t) => t + 1);

      img.onerror = () => {
        const current = cache.current.get(src);
        if (!current) return;

        // Blob URLs: fail silently — they're either valid instantly or gone forever
        if (isBlobUrl) {
          cache.current.delete(src);
          return;
        }

        if (current.retries < MAX_RETRIES) {
          const delay = RETRY_DELAYS[current.retries] || 3000;
          current.retries++;
          console.warn(
            `[ImageCache] Load failed for "${src.slice(0, 80)}…", retry ${current.retries}/${MAX_RETRIES} in ${delay}ms`,
          );
          setTimeout(() => {
            // Force a fresh load by appending a cache-buster
            const separator = src.includes('?') ? '&' : '?';
            current.img.src = `${src}${separator}_retry=${current.retries}`;
          }, delay);
        } else {
          // Exhausted retries — remove so next getImage() call starts fresh
          console.error(
            `[ImageCache] Gave up loading "${src.slice(0, 80)}…" after ${MAX_RETRIES} retries`,
          );
          cache.current.delete(src);
          setTick((t) => t + 1);
        }
      };

      img.src = src;
    }
    return null; // still loading
  }, []);

  const preload = useCallback(
    (src: string) => {
      getImage(src);
    },
    [getImage],
  );

  /**
   * Replace an old src in the cache with a new one.
   * Useful when swapping a blob URL for a persistent signed URL.
   */
  const replaceUrl = useCallback(
    (oldSrc: string, newSrc: string) => {
      cache.current.delete(oldSrc);
      getImage(newSrc);
    },
    [getImage],
  );

  return { getImage, preload, replaceUrl };
}