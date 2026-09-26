/**
 * Siam Parvez logo mark (inline SVG: crisp at any size, no extra request).
 * Decorative — always place the brand name next to it or inside the surrounding link.
 */
export function BrandMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={`block shrink-0 ${className}`} aria-hidden>
      <path
        d="M52 0H12C5.37258 0 0 5.37258 0 12V52C0 58.6274 5.37258 64 12 64H52C58.6274 64 64 58.6274 64 52V12C64 5.37258 58.6274 0 52 0Z"
        fill="#CCFF00"
      />
      <path d="M14 31.92H49.84V49.84H14L49.84 14H31.9494L14 31.92Z" fill="black" />
    </svg>
  );
}
