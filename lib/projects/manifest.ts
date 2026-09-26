import { promises as fs } from 'node:fs';
import path from 'node:path';

import { PROJECT_FILE } from './layout';
import type { ImageRecord, ProjectRecord } from './types';
import { optionalDescription, parseProjectRecord } from './validation';

/**
 * Filesystem read/write of `project.json` for the preparation CLI.
 * (The web app reads project.json through the storage driver instead.)
 */

export async function readProjectManifest(projectDir: string): Promise<ProjectRecord | null> {
  try {
    const raw = await fs.readFile(path.join(projectDir, PROJECT_FILE), 'utf8');
    return parseProjectRecord(JSON.parse(raw) as unknown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Atomic write: temp file + rename, so the viewer never reads a half-written manifest. */
export async function writeProjectManifest(projectDir: string, record: ProjectRecord): Promise<void> {
  await fs.mkdir(projectDir, { recursive: true });
  const target = path.join(projectDir, PROJECT_FILE);
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  await fs.rename(temp, target);
}

export function createProjectRecord(input: {
  id: string;
  title: string;
  description?: string;
}): ProjectRecord {
  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    ...optionalDescription(input.description),
    access: { mode: 'public' },
    images: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Returns a new record with the image added, or replaced in place when the id already exists. */
export function upsertImage(record: ProjectRecord, image: ImageRecord): ProjectRecord {
  const exists = record.images.some((entry) => entry.id === image.id);
  return {
    ...record,
    images: exists
      ? record.images.map((entry) => (entry.id === image.id ? image : entry))
      : [...record.images, image],
    updatedAt: new Date().toISOString(),
  };
}
