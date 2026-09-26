import type { ReactNode } from 'react';

import { BRAND } from '@/lib/brand';

import { BrandMark } from './BrandMark';

interface StatusPageProps {
  eyebrow?: string;
  title: string;
  message: ReactNode;
  children?: ReactNode;
}

/** Calm, branded full-page message used for not-found, empty and error screens. */
export function StatusPage({ eyebrow, title, message, children }: StatusPageProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-between bg-stage p-6">
      <span aria-hidden />
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="flex justify-center pb-2">
          <BrandMark className="size-10" />
        </div>
        {eyebrow && <p className="text-[11px] tracking-[0.18em] text-muted uppercase">{eyebrow}</p>}
        <h1 className="text-xl font-medium text-ink">{title}</h1>
        <div className="text-sm leading-relaxed text-muted">{message}</div>
        {children}
      </div>
      <footer className="pt-10 text-center text-xs text-muted">
        {BRAND.productCredit} ·{' '}
        <a href={BRAND.siteUrl} className="underline-offset-4 hover:text-ink hover:underline">
          {BRAND.siteLabel}
        </a>{' '}
        ·{' '}
        <a
          href={`mailto:${BRAND.email}`}
          className="underline-offset-4 hover:text-ink hover:underline"
        >
          {BRAND.email}
        </a>
      </footer>
    </main>
  );
}
