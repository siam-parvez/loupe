import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { IMAGES_DIR, ORIGINAL_FILE, PROJECT_FILE, imageKey } from '@/lib/projects/layout';
import { isValidId } from '@/lib/projects/validation';

import type { OriginalSource, StorageDriver } from './types';

function isNotFound(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === 'ENOENT' || code === 'ENOTDIR';
}

export function createLocalStorage(rootDir: string): StorageDriver {
  const root = path.resolve(rootDir);

  /** Maps a storage key to an absolute path and refuses anything outside the root. */
  function resolveKey(key: string): string {
    const full = path.resolve(root, ...key.split('/'));
    if (!full.startsWith(root + path.sep)) {
      throw new Error(`Refusing to access path outside storage root: ${key}`);
    }
    return full;
  }

  async function readOrNull<T>(key: string, read: (file: string) => Promise<T>): Promise<T | null> {
    try {
      return await read(resolveKey(key));
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async function hasProjectFile(id: string): Promise<boolean> {
    try {
      await fs.access(path.join(root, id, PROJECT_FILE));
      return true;
    } catch {
      return false;
    }
  }

  return {
    kind: 'local',

    readText: (key) => readOrNull(key, (file) => fs.readFile(file, 'utf8')),

    readBinary: (key) => readOrNull(key, (file) => fs.readFile(file)),

    async listProjectIds() {
      try {
        const entries = await fs.readdir(root, { withFileTypes: true });
        const ids = entries.filter((e) => e.isDirectory() && isValidId(e.name)).map((e) => e.name);
        const present = await Promise.all(ids.map(hasProjectFile));
        return ids.filter((_, index) => present[index]).sort();
      } catch (error) {
        if (isNotFound(error)) return [];
        throw error;
      }
    },

    tileBaseUrl: (projectId, imageId, version) =>
      `/api/projects/${projectId}/${IMAGES_DIR}/${imageId}/tiles/${version}/`,

    thumbnailUrl: (projectId, imageId, version) =>
      `/api/projects/${projectId}/${IMAGES_DIR}/${imageId}/thumbnail?v=${version}`,

    async resolveOriginal(projectId, imageId): Promise<OriginalSource | null> {
      const file = resolveKey(imageKey(projectId, imageId, ORIGINAL_FILE));
      try {
        const stat = await fs.stat(file);
        if (!stat.isFile()) return null;
        return { kind: 'file', path: file, size: stat.size, mtimeMs: stat.mtimeMs };
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
  };
}
