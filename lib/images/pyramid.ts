import { createHash } from 'node:crypto';
import { constants as fsConstants, createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';

import sharp, { type Metadata } from 'sharp';

import {
  DZI_FILE,
  IMAGES_DIR,
  ORIGINAL_FILE,
  THUMBNAIL_FILE,
  TILES_DIR,
  TILE_FORMAT,
  TILE_OVERLAP,
  TILE_SIZE,
} from '@/lib/projects/layout';
import type { ImageRecord } from '@/lib/projects/types';
import { buildDownloadFileName } from '@/lib/projects/validation';

import { getMaxLevel, getSingleTileLevel, getTileGrid, parseDzi } from './dzi';

/** Errors with a message that is safe and useful to show to whoever runs the CLI. */
export class PrepareError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PrepareError';
  }
}

export interface PrepareImageOptions {
  sourcePath: string;
  projectDir: string;
  imageId: string;
  title: string;
  description?: string;
  /** WebP quality 1–100. */
  quality: number;
  log: (message: string) => void;
}

export interface PrepareImageResult {
  record: ImageRecord;
  levels: number;
  tileCount: number;
  tileBytes: number;
}

// libvips streams through the image; don't keep decoded pixels around between operations.
sharp.cache(false);

/** Artwork can be 30 000+ px; lift sharp's default decompression-bomb pixel limit. */
const SHARP_INPUT = { limitInputPixels: false } as const;

const HEARTBEAT_MS = 10_000;

async function sha256File(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

async function readSourceMetadata(sourcePath: string): Promise<{ width: number; height: number }> {
  const stat = await fs.stat(sourcePath).catch(() => null);
  if (!stat?.isFile()) throw new PrepareError(`File not found: ${sourcePath}`);

  let metadata: Metadata;
  try {
    metadata = await sharp(sourcePath, SHARP_INPUT).metadata();
  } catch (error) {
    throw new PrepareError(`Could not read "${path.basename(sourcePath)}" as an image.`, {
      cause: error,
    });
  }

  if (metadata.format !== 'png') {
    throw new PrepareError(
      `Unsupported image format "${metadata.format ?? 'unknown'}" — please provide a PNG file.`,
    );
  }
  if (!metadata.width || !metadata.height) {
    throw new PrepareError('The PNG has no readable dimensions.');
  }
  return { width: metadata.width, height: metadata.height };
}

/** Copies the original byte-for-byte and proves it is identical via SHA-256. */
async function copyOriginal(sourcePath: string, target: string): Promise<string> {
  await fs.copyFile(sourcePath, target, fsConstants.COPYFILE_EXCL);
  const [sourceHash, copyHash] = await Promise.all([sha256File(sourcePath), sha256File(target)]);
  if (sourceHash !== copyHash) {
    throw new PrepareError(
      'The copied original does not match the source file (checksum mismatch).',
    );
  }
  return sourceHash;
}

/** Runs a slow task while printing an elapsed-time heartbeat. */
async function withHeartbeat<T>(
  label: string,
  log: (message: string) => void,
  task: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  const timer = setInterval(() => {
    log(`  … ${label} (${Math.round((Date.now() - started) / 1000)}s)`);
  }, HEARTBEAT_MS);
  try {
    return await task();
  } finally {
    clearInterval(timer);
  }
}

async function generateTiles(sourcePath: string, workDir: string, quality: number): Promise<void> {
  // sharp writes `<name>.dzi` plus `<name>_files/<level>/<col>_<row>.webp` for layout "dz".
  const baseName = path.parse(DZI_FILE).name;
  try {
    await sharp(sourcePath, SHARP_INPUT)
      .webp({ quality, effort: 4 })
      .tile({ size: TILE_SIZE, overlap: TILE_OVERLAP, layout: 'dz', depth: 'onepixel' })
      .toFile(path.join(workDir, `${baseName}.dz`));
  } catch (error) {
    throw new PrepareError('Generating the tile pyramid failed.', { cause: error });
  }
  const tilesDir = path.join(workDir, TILES_DIR);
  await fs.rename(path.join(workDir, `${baseName}_files`), tilesDir);
  // libvips drops image metadata here; it is not part of the Deep Zoom spec and not served.
  await fs.rm(path.join(tilesDir, 'vips-properties.xml'), { force: true });
}

async function countLevelTiles(
  levelDir: string,
  level: number,
  expected: { columns: number; rows: number },
): Promise<{ count: number; bytes: number }> {
  const files = await fs.readdir(levelDir).catch(() => {
    throw new PrepareError(`Tile level ${level} is missing.`);
  });
  const expectedCount = expected.columns * expected.rows;
  if (files.length !== expectedCount) {
    throw new PrepareError(
      `Tile level ${level} has ${files.length} tiles, expected ${expectedCount}.`,
    );
  }
  const lastTile = `${expected.columns - 1}_${expected.rows - 1}.${TILE_FORMAT}`;
  if (!files.includes(lastTile)) throw new PrepareError(`Tile ${level}/${lastTile} is missing.`);

  const sizes = await Promise.all(files.map((file) => fs.stat(path.join(levelDir, file))));
  return { count: files.length, bytes: sizes.reduce((sum, stat) => sum + stat.size, 0) };
}

/** Confirms the pyramid matches exactly what OpenSeadragon will request for this DZI. */
async function verifyPyramid(
  workDir: string,
  expected: { width: number; height: number },
): Promise<{ levels: number; tileCount: number; tileBytes: number }> {
  const dzi = parseDzi(await fs.readFile(path.join(workDir, DZI_FILE), 'utf8'));
  if (dzi.width !== expected.width || dzi.height !== expected.height) {
    throw new PrepareError('DZI dimensions do not match the source image.');
  }
  if (dzi.format !== TILE_FORMAT || dzi.tileSize !== TILE_SIZE || dzi.overlap !== TILE_OVERLAP) {
    throw new PrepareError('DZI tile settings are not what the viewer expects.');
  }

  const maxLevel = getMaxLevel(dzi.width, dzi.height);
  let tileCount = 0;
  let tileBytes = 0;
  for (let level = 0; level <= maxLevel; level += 1) {
    const grid = getTileGrid(dzi.width, dzi.height, level, dzi.tileSize);
    const levelDir = path.join(workDir, TILES_DIR, String(level));
    const { count, bytes } = await countLevelTiles(levelDir, level, grid);
    tileCount += count;
    tileBytes += bytes;
  }
  return { levels: maxLevel + 1, tileCount, tileBytes };
}

/** Moves the finished work dir into place, replacing any previous version of the image. */
async function swapIntoPlace(workDir: string, finalDir: string): Promise<void> {
  const previous = `${finalDir}.old-${Date.now()}`;
  const hadPrevious = await fs
    .rename(finalDir, previous)
    .then(() => true)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return false;
      throw error;
    });
  await fs.rename(workDir, finalDir);
  if (hadPrevious) await fs.rm(previous, { recursive: true, force: true });
}

/**
 * Prepares one PNG for deep-zoom viewing:
 *   images/<imageId>/original.png   – untouched copy (checksum-verified)
 *   images/<imageId>/artwork.dzi    – Deep Zoom descriptor
 *   images/<imageId>/tiles/…        – 512 px WebP pyramid
 *   images/<imageId>/thumbnail.webp – single-tile preview for the image switcher
 */
export async function prepareImage(options: PrepareImageOptions): Promise<PrepareImageResult> {
  const { sourcePath, projectDir, imageId, title, description, quality, log } = options;

  const { width, height } = await readSourceMetadata(sourcePath);
  const sourceBytes = (await fs.stat(sourcePath)).size;
  log(`  ${width} × ${height} px, ${getMaxLevel(width, height) + 1} zoom levels`);

  const imagesDir = path.join(projectDir, IMAGES_DIR);
  await fs.mkdir(imagesDir, { recursive: true });
  const workDir = path.join(imagesDir, `.tmp-${imageId}-${Date.now()}`);
  await fs.mkdir(workDir);

  try {
    log('  Copying original (untouched)…');
    const sha256 = await copyOriginal(sourcePath, path.join(workDir, ORIGINAL_FILE));

    log(`  Generating ${TILE_SIZE}px WebP tiles (quality ${quality})…`);
    await withHeartbeat('still tiling', log, () => generateTiles(sourcePath, workDir, quality));

    log('  Verifying tile pyramid…');
    const stats = await verifyPyramid(workDir, { width, height });

    const thumbLevel = getSingleTileLevel(width, height, TILE_SIZE);
    await fs.copyFile(
      path.join(workDir, TILES_DIR, String(thumbLevel), `0_0.${TILE_FORMAT}`),
      path.join(workDir, THUMBNAIL_FILE),
    );

    await swapIntoPlace(workDir, path.join(imagesDir, imageId));

    return {
      ...stats,
      record: {
        id: imageId,
        title,
        description,
        downloadFileName: buildDownloadFileName(title),
        originalBytes: sourceBytes,
        originalSha256: sha256,
        width,
        height,
        version: `${Date.now().toString(36)}-${sha256.slice(0, 8)}`,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    await fs.rm(workDir, { recursive: true, force: true });
    throw error;
  }
}
