/** Where the untouched original PNG can be obtained from. */
export type OriginalSource =
  { kind: 'file'; path: string; size: number; mtimeMs: number } | { kind: 'redirect'; url: string };

/**
 * Storage backend for prepared projects. Keys follow `lib/projects/layout.ts`.
 *
 * - `local`  – files on disk; tiles, thumbnails and originals are streamed by the app's API routes.
 * - `remote` – files in object storage (e.g. Cloudflare R2) served directly by its CDN;
 *              the app only reads metadata and redirects downloads.
 */
export interface StorageDriver {
  readonly kind: 'local' | 'remote';
  /** Small text files (project.json, artwork.dzi). `null` when missing. */
  readText(key: string): Promise<string | null>;
  /** Small binary files served through the app (tiles, thumbnails). `null` when missing/unsupported. */
  readBinary(key: string): Promise<Buffer | null>;
  /** Project IDs available for the development index page. */
  listProjectIds(): Promise<string[]>;
  /** Browser-facing base URL for tiles, ending with `/`. */
  tileBaseUrl(projectId: string, imageId: string, version: string): string;
  /** Browser-facing URL of the small switcher thumbnail. */
  thumbnailUrl(projectId: string, imageId: string, version: string): string;
  /** Location of the original PNG for the download endpoint. `null` when missing. */
  resolveOriginal(projectId: string, imageId: string): Promise<OriginalSource | null>;
}

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigError';
  }
}
