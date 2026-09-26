export type ByteRange = { start: number; end: number };

/**
 * Parses a single-range `Range: bytes=…` header (resumable downloads on slow connections).
 * Returns `null` when no usable range was requested, `'unsatisfiable'` for out-of-bounds ranges.
 * Multi-range requests are answered with the full file (allowed by RFC 9110).
 */
export function parseRangeHeader(
  header: string | null,
  size: number,
): ByteRange | 'unsatisfiable' | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart = '', rawEnd = ''] = match;
  if (rawStart === '' && rawEnd === '') return null;

  if (rawStart === '') {
    const suffix = Number(rawEnd);
    if (suffix === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1);
  if (start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

/** `attachment` Content-Disposition with an ASCII fallback plus RFC 5987 UTF-8 filename. */
export function attachmentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
export const SHORT_CACHE = 'public, max-age=300, stale-while-revalidate=86400';
export const NO_STORE = 'private, no-store';
