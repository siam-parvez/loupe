'use client';

import { useEffect } from 'react';

import { StatusPage } from '@/components/StatusPage';

/** Friendly fallback for unexpected server/render errors. Never shows technical details. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      title="This page couldn't be loaded"
      message="Something went wrong on our side. Please try again in a moment."
    >
      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex h-10 items-center rounded-full border border-line px-5 text-sm text-ink hover:bg-white/5"
      >
        Try again
      </button>
    </StatusPage>
  );
}
