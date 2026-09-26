import 'server-only';

import { ORIGINAL_FILE, THUMBNAIL_FILE, TILES_DIR, imageKey } from '@/lib/projects/layout';

import type { StorageDriver } from './types';

/** How long (seconds) Next.js may cache project.json / artwork.dzi fetched from object storage. */
const METADATA_REVALIDATE_SECONDS = 60;

interface RemoteStorageOptions {
  /** Public base URL mirroring the local `projects/` layout, without trailing slash. */
  assetBaseUrl: string;
  /** Base URL for originals. Point this at a private bucket + signed URLs for client work. */
  originalsBaseUrl: string;
}

/**
 * Object-storage driver (Cloudflare R2, S3, any static host). Tiles and thumbnails are loaded by
 * the browser straight from the CDN; the app only reads small metadata files.
 */
export function createRemoteStorage({
  assetBaseUrl,
  originalsBaseUrl,
}: RemoteStorageOptions): StorageDriver {
  const urlFor = (base: string, key: string) => `${base}/${key}`;

  return {
    kind: 'remote',

    async readText(key) {
      const response = await fetch(urlFor(assetBaseUrl, key), {
        next: { revalidate: METADATA_REVALIDATE_SECONDS },
      });
      if (response.status === 404 || response.status === 403) return null;
      if (!response.ok) {
        throw new Error(`Remote storage responded ${response.status} for ${key}`);
      }
      return response.text();
    },

    // Binary assets are served by the CDN directly, never proxied through the app.
    readBinary: async () => null,

    // Object storage is not listed; the index page is a local development convenience only.
    listProjectIds: async () => [],

    tileBaseUrl: (projectId, imageId) =>
      urlFor(assetBaseUrl, imageKey(projectId, imageId, `${TILES_DIR}/`)),

    thumbnailUrl: (projectId, imageId, version) =>
      `${urlFor(assetBaseUrl, imageKey(projectId, imageId, THUMBNAIL_FILE))}?v=${version}`,

    // Replace with a presigned URL (e.g. aws4fetch or @aws-sdk/s3-request-presigner against R2)
    // once originals live in a private bucket.
    resolveOriginal: async (projectId, imageId) => ({
      kind: 'redirect',
      url: urlFor(originalsBaseUrl, imageKey(projectId, imageId, ORIGINAL_FILE)),
    }),
  };
}
