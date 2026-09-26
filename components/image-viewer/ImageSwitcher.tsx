'use client';

import { ChevronLeft, ChevronRight, LayoutGrid, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { ViewerImageSummary } from '@/lib/projects/types';

interface ImageSwitcherProps {
  images: ViewerImageSummary[];
  currentIndex: number;
}

const navClass =
  'inline-flex size-10 items-center justify-center rounded-full text-ink/90 transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:outline-none';

function StepLink({
  image,
  direction,
}: {
  image?: ViewerImageSummary;
  direction: 'prev' | 'next';
}) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  const label = direction === 'prev' ? 'Previous artwork' : 'Next artwork';
  if (!image) {
    return (
      <span className={`${navClass} pointer-events-none opacity-30`} aria-hidden>
        <Icon className="size-[18px]" />
      </span>
    );
  }
  return (
    <Link href={image.href} scroll={false} className={navClass} aria-label={label} title={label}>
      <Icon className="size-[18px]" aria-hidden />
    </Link>
  );
}

/** Previous / next arrows plus a thumbnail tray, shown only when a project has several images. */
export function ImageSwitcher({ images, currentIndex }: ImageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  if (images.length < 2) return null;

  return (
    <div ref={panelRef} className="relative flex items-center gap-0.5">
      <StepLink image={images[currentIndex - 1]} direction="prev" />
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Show all artworks"
        className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm text-ink/90 transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:outline-none"
      >
        <LayoutGrid className="size-4" aria-hidden />
        <span className="font-mono text-xs tabular-nums">
          {currentIndex + 1} / {images.length}
        </span>
      </button>
      <StepLink image={images[currentIndex + 1]} direction="next" />

      {open && (
        <div
          role="dialog"
          aria-label="All artworks"
          className="absolute bottom-full left-0 z-30 mb-3 w-[min(92vw,34rem)] rounded-2xl border border-line bg-panel/95 p-3 shadow-2xl backdrop-blur"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs tracking-[0.14em] text-muted uppercase">Artworks</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <ul className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {images.map((image, index) => (
              <li key={image.id}>
                <Link
                  href={image.href}
                  scroll={false}
                  onClick={() => setOpen(false)}
                  aria-current={index === currentIndex ? 'page' : undefined}
                  className="group block rounded-xl p-1.5 transition-colors hover:bg-white/5 aria-[current=page]:bg-white/[0.08]"
                >
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-black/40">
                    {/* Tiny ≤512 px switcher preview; the artwork itself is rendered by OpenSeadragon. */}
                    <Image
                      src={image.thumbnailUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="180px"
                      className="object-contain"
                    />
                  </span>
                  <span className="mt-1.5 block truncate px-0.5 text-xs text-ink/85">
                    {image.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
