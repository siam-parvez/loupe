'use client';

import { Maximize, Minimize } from 'lucide-react';
import { useRef, useState } from 'react';

import { BrandMark } from '@/components/BrandMark';
import { BRAND } from '@/lib/brand';
import { formatDimensions } from '@/lib/images/format';
import type { ViewerPayload } from '@/lib/projects/types';

import { DownloadButton } from './DownloadButton';
import { ErrorState } from './ErrorState';
import { ImageSwitcher } from './ImageSwitcher';
import { ImageViewer, type ViewerController, type ViewerStatus } from './ImageViewer';
import { LoadingState } from './LoadingState';
import { ControlButton, ViewerControls } from './ViewerControls';
import { useFullscreen } from './useFullscreen';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="hidden text-[10px] font-medium tracking-[0.18em] text-muted/80 uppercase lg:block">
      {children}
    </p>
  );
}

/**
 * Full-screen artwork review layout:
 *   header  – project / artwork title, fullscreen
 *   stage   – OpenSeadragon deep-zoom viewer (tiles only)
 *   footer  – VIEW controls  |  ORIGINAL FILE download (untouched PNG)
 */
export function ArtworkViewer({ payload }: { payload: ViewerPayload }) {
  const { project, images, current, currentIndex } = payload;
  const shellRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(shellRef);

  const [status, setStatus] = useState<ViewerStatus>({ kind: 'loading' });
  const [controller, setController] = useState<ViewerController | null>(null);
  const [zoomPercent, setZoomPercent] = useState<number | null>(null);
  const [tileWarningFor, setTileWarningFor] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const imageState = current.state;
  const controlsDisabled = imageState.status !== 'ready' || status.kind !== 'ready' || !controller;
  const hasManyImages = images.length > 1;

  return (
    <div
      ref={shellRef}
      className={`flex h-dvh flex-col bg-stage ${fullscreen.isFallback ? 'fixed inset-0 z-50' : ''}`}
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-panel px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <a
            href={BRAND.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`${BRAND.productCredit} · ${BRAND.siteLabel}`}
            className="flex shrink-0 items-center gap-2.5 rounded-lg text-ink focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:outline-none"
          >
            <BrandMark className="size-7" />
            <span className="sr-only text-sm leading-none font-semibold tracking-tight sm:not-sr-only">
              {BRAND.name}
            </span>
            <span className="hidden rounded-md border border-brand/30 px-1.5 py-1 text-[10px] leading-none font-medium tracking-[0.14em] text-brand uppercase md:inline">
              {BRAND.product}
            </span>
          </a>
          <span className="hidden h-6 w-px bg-line sm:block" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-[11px] tracking-[0.16em] text-muted uppercase">
              {project.title}
            </p>
            <h1 className="truncate text-sm font-medium text-ink sm:text-[15px]">
              {current.title}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden font-mono text-xs text-muted tabular-nums md:inline">
            {formatDimensions(current.width, current.height)}
          </span>
          <ControlButton
            label={fullscreen.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            icon={fullscreen.isFullscreen ? Minimize : Maximize}
            onClick={fullscreen.toggle}
            showLabel={false}
          />
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        {imageState.status === 'ready' ? (
          <>
            <ImageViewer
              key={`${current.id}:${attempt}`}
              tileSource={imageState.tileSource}
              title={current.title}
              onStatusChange={setStatus}
              onControllerChange={setController}
              onZoomChange={setZoomPercent}
              onTileError={() => setTileWarningFor(current.id)}
            />
            {status.kind === 'loading' && <LoadingState />}
            {status.kind === 'error' && (
              <ErrorState
                title="The artwork didn't load"
                message={status.message}
                onRetry={() => setAttempt((value) => value + 1)}
              />
            )}
            {status.kind === 'ready' && (
              <p
                key={current.id}
                className="animate-hint pointer-events-none absolute top-4 left-1/2 max-w-[90%] -translate-x-1/2 truncate rounded-full bg-black/55 px-4 py-2 text-xs text-ink/90 backdrop-blur"
              >
                <span className="pointer-coarse:hidden">
                  Scroll to zoom · Drag to move · Double-click to zoom in
                </span>
                <span className="hidden pointer-coarse:inline">
                  Pinch to zoom · Drag to move · Double-tap to zoom in
                </span>
              </p>
            )}
            {status.kind === 'ready' && tileWarningFor === current.id && (
              <p
                role="status"
                className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-black/60 px-4 py-2 text-xs text-amber-200 backdrop-blur"
              >
                Some areas are slow to load — they&apos;ll sharpen as your connection allows.
              </p>
            )}
          </>
        ) : (
          <ErrorState title="Not ready yet" message={imageState.message} />
        )}
      </main>

      <footer className="shrink-0 border-t border-line bg-panel px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
            <SectionLabel>View</SectionLabel>
            <ViewerControls
              disabled={controlsDisabled}
              zoomPercent={controlsDisabled ? null : zoomPercent}
              isFullscreen={fullscreen.isFullscreen}
              onZoomIn={() => controller?.zoomIn()}
              onZoomOut={() => controller?.zoomOut()}
              onFit={() => controller?.fit()}
              onToggleFullscreen={fullscreen.toggle}
            />
            {hasManyImages && (
              <>
                <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
                <ImageSwitcher images={images} currentIndex={currentIndex} />
              </>
            )}
          </div>

          {imageState.status === 'ready' && (
            <div className="flex items-center gap-4 border-t border-line pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
              <SectionLabel>Original file</SectionLabel>
              <div className="flex-1 sm:flex-none">
                <DownloadButton
                  url={imageState.downloadUrl}
                  fileName={imageState.downloadFileName}
                  bytes={imageState.originalBytes}
                />
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
