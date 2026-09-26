export function LoadingState({ message = 'Loading artwork preview…' }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4"
    >
      <span className="size-8 animate-spin rounded-full border-2 border-white/15 border-t-brand" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
