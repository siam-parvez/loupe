import 'server-only';

import { createLocalStorage } from './local';
import { createRemoteStorage } from './remote';
import { resolveLocalStorageDir } from './root';
import { StorageConfigError, type StorageDriver } from './types';

let cached: StorageDriver | undefined;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function createStorageFromEnv(): StorageDriver {
  const driver = (process.env.VIEWER_STORAGE_DRIVER ?? 'local').trim().toLowerCase();

  if (driver === 'local') return createLocalStorage(resolveLocalStorageDir());

  if (driver === 'remote') {
    const assetBaseUrl = process.env.VIEWER_ASSET_BASE_URL?.trim();
    if (!assetBaseUrl || !/^https?:\/\//.test(assetBaseUrl)) {
      throw new StorageConfigError(
        'VIEWER_ASSET_BASE_URL must be an http(s) URL when VIEWER_STORAGE_DRIVER=remote',
      );
    }
    const originalsBaseUrl = process.env.VIEWER_ORIGINALS_BASE_URL?.trim() || assetBaseUrl;
    return createRemoteStorage({
      assetBaseUrl: trimTrailingSlash(assetBaseUrl),
      originalsBaseUrl: trimTrailingSlash(originalsBaseUrl),
    });
  }

  throw new StorageConfigError(`Unknown VIEWER_STORAGE_DRIVER "${driver}" (use local or remote)`);
}

/** The configured storage driver (singleton per server process). */
export function getStorage(): StorageDriver {
  cached ??= createStorageFromEnv();
  return cached;
}

export type { OriginalSource, StorageDriver } from './types';
