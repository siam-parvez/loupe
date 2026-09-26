import path from 'node:path';

/**
 * Directory holding local projects. Shared by the Next.js server and the CLI scripts,
 * so it must not import `server-only`.
 */
export function resolveLocalStorageDir(): string {
  const configured = process.env.VIEWER_STORAGE_DIR?.trim();
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), configured || 'projects');
}
