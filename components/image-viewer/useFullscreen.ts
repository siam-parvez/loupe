'use client';

import { type RefObject, useCallback, useEffect, useState } from 'react';

/**
 * Fullscreen for the whole viewer shell (artwork + controls stay visible).
 * Falls back to a CSS "fill the window" mode where the Fullscreen API is missing (e.g. iPhone).
 */
export function useFullscreen(target: RefObject<HTMLElement | null>) {
  const [isNative, setIsNative] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const sync = () => setIsNative(document.fullscreenElement === target.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [target]);

  useEffect(() => {
    if (!isFallback) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFallback(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFallback]);

  const toggle = useCallback(async () => {
    const element = target.current;
    if (!element) return;

    if (!document.fullscreenEnabled || !element.requestFullscreen) {
      setIsFallback((value) => !value);
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await element.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      setIsFallback((value) => !value);
    }
  }, [target]);

  return { isFullscreen: isNative || isFallback, isFallback, toggle };
}
