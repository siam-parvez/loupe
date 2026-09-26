import type { DziInfo } from '@/lib/projects/types';

export class InvalidDziError extends Error {
  constructor(detail: string) {
    super(`Invalid DZI descriptor: ${detail}`);
    this.name = 'InvalidDziError';
  }
}

function readAttribute(xml: string, element: string, attribute: string): string {
  const tag = new RegExp(`<${element}\\b[^>]*>`, 'i').exec(xml)?.[0];
  if (!tag) throw new InvalidDziError(`missing <${element}> element`);
  const match = new RegExp(`\\b${attribute}\\s*=\\s*"([^"]*)"`, 'i').exec(tag);
  if (!match?.[1]) throw new InvalidDziError(`missing ${element}@${attribute}`);
  return match[1];
}

function readInt(xml: string, element: string, attribute: string, min: number): number {
  const value = Number(readAttribute(xml, element, attribute));
  if (!Number.isInteger(value) || value < min) {
    throw new InvalidDziError(`${element}@${attribute} must be an integer >= ${min}`);
  }
  return value;
}

/**
 * Parses the Deep Zoom XML written by sharp/libvips:
 *   <Image TileSize="512" Overlap="1" Format="webp" xmlns="…"><Size Width="…" Height="…"/></Image>
 */
export function parseDzi(xml: string): DziInfo {
  const format = readAttribute(xml, 'Image', 'Format').toLowerCase();
  if (!/^[a-z0-9]{2,5}$/.test(format)) throw new InvalidDziError('unsupported Format');

  return {
    tileSize: readInt(xml, 'Image', 'TileSize', 1),
    overlap: readInt(xml, 'Image', 'Overlap', 0),
    format,
    width: readInt(xml, 'Size', 'Width', 1),
    height: readInt(xml, 'Size', 'Height', 1),
  };
}

/** Highest Deep Zoom level: level 0 is 1×1 px, each level doubles, the last is full resolution. */
export function getMaxLevel(width: number, height: number): number {
  return Math.ceil(Math.log2(Math.max(width, height)));
}

/** Dimensions of the image at a given Deep Zoom level. */
export function getLevelDimensions(
  width: number,
  height: number,
  level: number,
): { width: number; height: number } {
  const scale = 2 ** (getMaxLevel(width, height) - level);
  return { width: Math.ceil(width / scale), height: Math.ceil(height / scale) };
}

/** Number of tile columns/rows at a given level. */
export function getTileGrid(
  width: number,
  height: number,
  level: number,
  tileSize: number,
): { columns: number; rows: number } {
  const dims = getLevelDimensions(width, height, level);
  return { columns: Math.ceil(dims.width / tileSize), rows: Math.ceil(dims.height / tileSize) };
}

/** Highest level that fits in a single tile — used as the switcher thumbnail. */
export function getSingleTileLevel(width: number, height: number, tileSize: number): number {
  const maxLevel = getMaxLevel(width, height);
  for (let level = maxLevel; level >= 0; level -= 1) {
    const dims = getLevelDimensions(width, height, level);
    if (dims.width <= tileSize && dims.height <= tileSize) return level;
  }
  return 0;
}
