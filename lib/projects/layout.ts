/**
 * Storage layout shared by the local filesystem, remote object storage (e.g. Cloudflare R2)
 * and the preparation CLI. Keys are relative, forward-slash separated paths:
 *
 *   <projectId>/project.json
 *   <projectId>/images/<imageId>/original.png      ← untouched source, download only
 *   <projectId>/images/<imageId>/artwork.dzi       ← Deep Zoom descriptor
 *   <projectId>/images/<imageId>/thumbnail.webp    ← small preview for the image switcher
 *   <projectId>/images/<imageId>/tiles/<level>/<col>_<row>.webp
 */

export const PROJECT_FILE = 'project.json';
export const IMAGES_DIR = 'images';
export const ORIGINAL_FILE = 'original.png';
export const DZI_FILE = 'artwork.dzi';
export const THUMBNAIL_FILE = 'thumbnail.webp';
export const TILES_DIR = 'tiles';

export const TILE_SIZE = 512;
export const TILE_OVERLAP = 1;
export const TILE_FORMAT = 'webp';

export function projectKey(projectId: string, file: string): string {
  return `${projectId}/${file}`;
}

export function imageKey(projectId: string, imageId: string, file: string): string {
  return `${projectId}/${IMAGES_DIR}/${imageId}/${file}`;
}

export function tileKey(projectId: string, imageId: string, level: number, tile: string): string {
  return imageKey(projectId, imageId, `${TILES_DIR}/${level}/${tile}`);
}
