'use client';

import { Download, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

import { BRAND } from '@/lib/brand';
import { formatBytes } from '@/lib/images/format';

interface DownloadButtonProps {
  /** Download endpoint for the untouched original PNG — never a tile or preview. */
  url: string;
  fileName: string;
  bytes: number;
}

type DownloadState = 'idle' | 'checking' | 'failed';

/**
 * Starts a native browser download of the original PNG. A quick HEAD request first confirms the
 * file is available so the client gets a clear message instead of a broken download. The file
 * streams straight to disk; it is never loaded into page memory.
 */
export function DownloadButton({ url, fileName, bytes }: DownloadButtonProps) {
  const [state, setState] = useState<DownloadState>('idle');

  async function handleClick() {
    setState('checking');
    try {
      const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.rel = 'noopener';
      document.body.append(link);
      link.click();
      link.remove();
      setState('idle');
    } catch (error) {
      console.error('[download] Original not available', error);
      setState('failed');
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'checking'}
        title={`Full-resolution print file · ${fileName}`}
        className="inline-flex h-11 items-center justify-center gap-2.5 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-ink transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-panel focus-visible:outline-none active:scale-[0.98] disabled:opacity-70"
      >
        {state === 'checking' ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <Download className="size-4" aria-hidden />
        )}
        Download Original PNG
      </button>
      <p className="text-center text-xs text-muted sm:text-right" aria-live="polite">
        {state === 'failed' ? (
          <span className="text-amber-300">
            The download couldn&apos;t start. Please try again or email {BRAND.email}.
          </span>
        ) : (
          <>Full-resolution print file · {formatBytes(bytes)}</>
        )}
      </p>
    </div>
  );
}
