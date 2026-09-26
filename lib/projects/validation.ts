import type { ImageRecord, ProjectRecord } from './types';

/** Lowercase slug, 1–64 chars, no leading/trailing dash. Also used for image IDs. */
const ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const TILE_FILE_PATTERN = /^\d{1,5}_\d{1,5}\.webp$/;
const LEVEL_PATTERN = /^\d{1,2}$/;
const VERSION_PATTERN = /^[a-z0-9-]{1,40}$/;

export function isValidId(value: string): boolean {
  return ID_PATTERN.test(value);
}

export function isValidTileFile(value: string): boolean {
  return TILE_FILE_PATTERN.test(value);
}

export function isValidLevel(value: string): boolean {
  return LEVEL_PATTERN.test(value);
}

export function isValidVersion(value: string): boolean {
  return VERSION_PATTERN.test(value);
}

/** "My Artwork (final) v2.png" → "my-artwork-final-v2" */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
}

/** "sunset-study_final" → "Sunset Study Final" */
export function humanize(input: string): string {
  return input
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "Sunset Study" → "Sunset-Study-Original-Full-Resolution.png" (ASCII only, safe for headers). */
export function buildDownloadFileName(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'Artwork'}-Original-Full-Resolution.png`;
}

export class InvalidProjectDataError extends Error {
  constructor(detail: string) {
    super(`Invalid project.json: ${detail}`);
    this.name = 'InvalidProjectDataError';
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(obj: UnknownRecord, key: string, context: string): string {
  const value = obj[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidProjectDataError(`${context}.${key} must be a non-empty string`);
  }
  return value;
}

function optionalString(obj: UnknownRecord, key: string, context: string): string | undefined {
  const value = obj[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new InvalidProjectDataError(`${context}.${key} must be a string`);
  }
  return value;
}

/** Omits the key entirely when absent, so parsed records stay minimal. */
export function optionalDescription(description: string | undefined): { description?: string } {
  return description === undefined ? {} : { description };
}

function requirePositiveInt(obj: UnknownRecord, key: string, context: string): number {
  const value = obj[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new InvalidProjectDataError(`${context}.${key} must be a positive integer`);
  }
  return value;
}

function parseImage(value: unknown, index: number): ImageRecord {
  const context = `images[${index}]`;
  if (!isRecord(value)) throw new InvalidProjectDataError(`${context} must be an object`);

  const id = requireString(value, 'id', context);
  if (!isValidId(id)) throw new InvalidProjectDataError(`${context}.id "${id}" is not a valid id`);
  const version = requireString(value, 'version', context);
  if (!isValidVersion(version)) throw new InvalidProjectDataError(`${context}.version is invalid`);

  return {
    id,
    title: requireString(value, 'title', context),
    ...optionalDescription(optionalString(value, 'description', context)),
    downloadFileName: requireString(value, 'downloadFileName', context),
    originalBytes: requirePositiveInt(value, 'originalBytes', context),
    originalSha256: requireString(value, 'originalSha256', context),
    width: requirePositiveInt(value, 'width', context),
    height: requirePositiveInt(value, 'height', context),
    version,
    createdAt: requireString(value, 'createdAt', context),
  };
}

/** Validates untrusted JSON (from disk or object storage) into a ProjectRecord. */
export function parseProjectRecord(value: unknown): ProjectRecord {
  if (!isRecord(value)) throw new InvalidProjectDataError('root must be an object');
  if (value.schemaVersion !== 1) throw new InvalidProjectDataError('unsupported schemaVersion');

  const id = requireString(value, 'id', 'project');
  if (!isValidId(id)) throw new InvalidProjectDataError(`project.id "${id}" is not a valid id`);

  const access = value.access;
  if (!isRecord(access) || access.mode !== 'public') {
    throw new InvalidProjectDataError('project.access.mode must be "public"');
  }

  if (!Array.isArray(value.images)) throw new InvalidProjectDataError('images must be an array');
  const images = value.images.map(parseImage);
  const ids = new Set(images.map((image) => image.id));
  if (ids.size !== images.length) throw new InvalidProjectDataError('image ids must be unique');

  return {
    schemaVersion: 1,
    id,
    title: requireString(value, 'title', 'project'),
    ...optionalDescription(optionalString(value, 'description', 'project')),
    access: { mode: 'public' },
    images,
    updatedAt: requireString(value, 'updatedAt', 'project'),
  };
}
