import { Maximize, Minimize, Minus, Plus, Scan } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

interface ViewerControlsProps {
  disabled: boolean;
  zoomPercent: number | null;
  isFullscreen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleFullscreen: () => void;
}

interface ControlButtonProps {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  onClick: () => void;
  disabled?: boolean;
  /** 'always' keeps the text on phones too; true shows it from tablet width up. */
  showLabel?: boolean | 'always';
}

export function ControlButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  showLabel = true,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-full px-3 text-sm text-ink/90 transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:outline-none active:bg-white/10 disabled:pointer-events-none disabled:opacity-35"
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      {showLabel && (
        <span className={showLabel === 'always' ? 'inline' : 'hidden md:inline'}>{label}</span>
      )}
    </button>
  );
}

export function ViewerControls({
  disabled,
  zoomPercent,
  isFullscreen,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleFullscreen,
}: ViewerControlsProps) {
  return (
    <div className="flex items-center gap-0.5" role="toolbar" aria-label="Artwork view controls">
      <ControlButton
        label="Zoom out"
        icon={Minus}
        onClick={onZoomOut}
        disabled={disabled}
        showLabel={false}
      />
      <span
        className="w-12 text-center font-mono text-xs text-muted tabular-nums"
        aria-live="polite"
        title="Zoom relative to actual pixels"
      >
        {zoomPercent === null ? '—' : `${zoomPercent}%`}
      </span>
      <ControlButton
        label="Zoom in"
        icon={Plus}
        onClick={onZoomIn}
        disabled={disabled}
        showLabel={false}
      />
      <span className="mx-1.5 h-5 w-px bg-line" aria-hidden />
      <ControlButton
        label="Fit"
        icon={Scan}
        onClick={onFit}
        disabled={disabled}
        showLabel="always"
      />
      <ControlButton
        label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        icon={isFullscreen ? Minimize : Maximize}
        onClick={onToggleFullscreen}
      />
    </div>
  );
}
