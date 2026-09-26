'use client';

import type OpenSeadragon from 'openseadragon';
import { useEffect, useEffectEvent, useRef } from 'react';

import type { ViewerTileSource } from '@/lib/projects/types';

const DZI_XMLNS = 'http://schemas.microsoft.com/deepzoom/2008';
/** If this many tiles fail before any tile has loaded, treat the viewer as broken. */
const FAILURES_BEFORE_ERROR = 4;
const ZOOM_STEP = 1.6;

export interface ViewerController {
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
}

export type ViewerStatus =
  { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string };

interface ImageViewerProps {
  tileSource: ViewerTileSource;
  title: string;
  onStatusChange: (status: ViewerStatus) => void;
  onControllerChange: (controller: ViewerController | null) => void;
  onZoomChange: (percent: number) => void;
  onTileError: () => void;
}

/**
 * Inline Deep Zoom descriptor. Equivalent to pointing OpenSeadragon at `artwork.dzi`, but saves a
 * request and lets tiles live at any URL (local API route or Cloudflare R2). OpenSeadragon requests
 * `<Url><level>/<col>_<row>.<Format>` — exactly the layout sharp generates.
 */
function toDziTileSource(source: ViewerTileSource) {
  return {
    Image: {
      xmlns: DZI_XMLNS,
      Url: source.url,
      Format: source.format,
      Overlap: String(source.overlap),
      TileSize: String(source.tileSize),
      Size: { Width: String(source.width), Height: String(source.height) },
    },
  };
}

function buildOptions(element: HTMLElement, source: ViewerTileSource): OpenSeadragon.Options {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const touchGestures = { pinchToZoom: true, dblClickToZoom: true, flickEnabled: true };

  return {
    element,
    tileSources: toDziTileSource(source),
    // Canvas drawer: predictable memory use and broad support on older laptops.
    drawer: 'canvas',
    crossOriginPolicy: 'Anonymous',
    showNavigationControl: false,
    // Minimap for orientation on desktop (hidden on narrow screens via globals.css).
    showNavigator: !isTouch,
    navigatorPosition: 'BOTTOM_RIGHT',
    navigatorSizeRatio: 0.14,
    navigatorAutoFade: true,
    navigatorBackground: '#000000',
    navigatorBorderColor: '#2e2e2e',
    navigatorDisplayRegionColor: '#ccff00',
    // Smooth, gentle motion.
    animationTime: 0.9,
    springStiffness: 8,
    blendTime: 0.15,
    // Progressive loading: blurry low-res first, sharper tiles blend in. Never preload everything.
    immediateRender: false,
    preload: false,
    // Zoom limits: fit-to-screen (slightly smaller allowed) up to 2× actual pixels.
    minZoomImageRatio: 0.8,
    maxZoomPixelRatio: 2,
    visibilityRatio: 0.6,
    constrainDuringPan: true,
    zoomPerScroll: 1.25,
    zoomPerClick: 2,
    // Slow networks / low RAM: few parallel requests, bounded decoded-tile cache (~1 MB each).
    imageLoaderLimit: isTouch ? 4 : 6,
    maxImageCacheCount: isTouch ? 60 : 120,
    timeout: 60_000,
    gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, scrollToZoom: true },
    gestureSettingsTouch: touchGestures,
    gestureSettingsPen: touchGestures,
  };
}

/** True while the whole image is on screen, i.e. the visitor has not zoomed into a detail. */
function isShowingWholeImage(viewer: OpenSeadragon.Viewer): boolean {
  const view = viewer.viewport.getBounds(true);
  const image = viewer.world.getHomeBounds();
  const epsilon = image.width * 0.01;
  return (
    view.x <= image.x + epsilon &&
    view.y <= image.y + epsilon &&
    view.x + view.width >= image.x + image.width - epsilon &&
    view.y + view.height >= image.y + image.height - epsilon
  );
}

function createController(viewer: OpenSeadragon.Viewer): ViewerController {
  const zoom = (factor: number) => {
    viewer.viewport.zoomBy(factor);
    viewer.viewport.applyConstraints();
  };
  return {
    zoomIn: () => zoom(ZOOM_STEP),
    zoomOut: () => zoom(1 / ZOOM_STEP),
    fit: () => viewer.viewport.goHome(),
  };
}

/**
 * OpenSeadragon deep-zoom canvas. Only the tiles needed for the current view and zoom level are
 * requested; the original PNG is never loaded here.
 */
export function ImageViewer({
  tileSource,
  title,
  onStatusChange,
  onControllerChange,
  onZoomChange,
  onTileError,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const emitStatus = useEffectEvent(onStatusChange);
  const emitController = useEffectEvent(onControllerChange);
  const emitZoom = useEffectEvent(onZoomChange);
  const emitTileError = useEffectEvent(onTileError);

  useEffect(() => {
    let viewer: OpenSeadragon.Viewer | undefined;
    let cancelled = false;
    let hasLoadedTile = false;
    let failedTiles = 0;
    let lastZoom = -1;

    emitStatus({ kind: 'loading' });

    const reportZoom = () => {
      if (!viewer?.world.getItemAt(0)) return;
      const viewport = viewer.viewport;
      const percent = Math.round(viewport.viewportToImageZoom(viewport.getZoom(true)) * 100);
      if (percent !== lastZoom) {
        lastZoom = percent;
        emitZoom(percent);
      }
    };

    const attachHandlers = (instance: OpenSeadragon.Viewer) => {
      instance.addHandler('open', () => {
        emitController(createController(instance));
        // The stage can still be settling (fonts, toolbar wrap) when the viewer opens;
        // fit again once layout is final so the artwork starts fully and exactly in view.
        requestAnimationFrame(() => {
          if (cancelled) return;
          instance.viewport.goHome(true);
          reportZoom();
        });
      });
      instance.addHandler('open-failed', () => {
        emitStatus({ kind: 'error', message: 'The artwork preview could not be opened.' });
      });
      instance.addHandler('tile-loaded', () => {
        if (hasLoadedTile) return;
        hasLoadedTile = true;
        emitStatus({ kind: 'ready' });
      });
      instance.addHandler('tile-load-failed', () => {
        failedTiles += 1;
        if (hasLoadedTile) {
          emitTileError();
        } else if (failedTiles >= FAILURES_BEFORE_ERROR) {
          emitStatus({
            kind: 'error',
            message: "We couldn't load the artwork. Please check your internet connection.",
          });
        }
      });
      instance.addHandler('animation', reportZoom);
      instance.addHandler('after-resize', () => {
        // Window/orientation change while fitted: re-fit instead of leaving the artwork tiny.
        // Deferred one frame because OpenSeadragon re-applies its own zoom right after this event.
        if (instance.world.getItemAt(0) && isShowingWholeImage(instance)) {
          requestAnimationFrame(() => {
            if (!cancelled) instance.viewport.goHome(true);
          });
        }
        requestAnimationFrame(reportZoom);
      });
    };

    const init = async () => {
      // OpenSeadragon touches `window`, so load it only in the browser.
      const { default: createViewer } = await import('openseadragon');
      const element = containerRef.current;
      if (cancelled || !element) return;
      viewer = createViewer(buildOptions(element, tileSource));
      attachHandlers(viewer);
    };

    init().catch((error: unknown) => {
      console.error('[viewer] Failed to start OpenSeadragon', error);
      if (!cancelled) emitStatus({ kind: 'error', message: 'The viewer could not start.' });
    });

    return () => {
      cancelled = true;
      emitController(null);
      viewer?.destroy();
      viewer = undefined;
    };
  }, [tileSource]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`${title} — zoomable artwork. Scroll or pinch to zoom, drag to move.`}
      className="absolute inset-0 touch-none select-none"
    />
  );
}
