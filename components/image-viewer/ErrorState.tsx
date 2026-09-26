import { ImageOff, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="absolute inset-0 flex items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border border-line text-muted">
          <ImageOff className="size-5" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-base font-medium text-ink">{title}</h2>
          <p className="text-sm leading-relaxed text-muted">{message}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-5 text-sm text-ink transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:outline-none"
          >
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
