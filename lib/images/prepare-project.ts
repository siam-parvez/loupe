import path from 'node:path';

import {
  createProjectRecord,
  readProjectManifest,
  upsertImage,
  writeProjectManifest,
} from '@/lib/projects/manifest';
import type { ProjectRecord } from '@/lib/projects/types';
import { humanize, isValidId } from '@/lib/projects/validation';

import { formatBytes } from './format';
import { PrepareError, prepareImage } from './pyramid';

export interface ImageInput {
  sourcePath: string;
  imageId: string;
  title: string;
  description?: string;
}

export interface PrepareProjectOptions {
  projectsRoot: string;
  projectId: string;
  projectTitle?: string;
  projectDescription?: string;
  images: ImageInput[];
  quality: number;
  /** Replace images that already exist in the project. */
  force: boolean;
  log: (message: string) => void;
}

function assertInputs(options: PrepareProjectOptions, existing: ProjectRecord | null): void {
  if (!isValidId(options.projectId)) {
    throw new PrepareError(
      `Invalid project id "${options.projectId}". Use lowercase letters, numbers and dashes.`,
    );
  }
  const seen = new Set<string>();
  for (const image of options.images) {
    if (!isValidId(image.imageId)) {
      throw new PrepareError(
        `Invalid image id "${image.imageId}". Use lowercase letters, numbers and dashes.`,
      );
    }
    if (seen.has(image.imageId)) {
      throw new PrepareError(`Two images would get the same id "${image.imageId}".`);
    }
    seen.add(image.imageId);
    if (!options.force && existing?.images.some((entry) => entry.id === image.imageId)) {
      throw new PrepareError(
        `Image "${image.imageId}" already exists in project "${options.projectId}". ` +
          'Re-run with --force to replace it.',
      );
    }
  }
}

function initialRecord(options: PrepareProjectOptions, existing: ProjectRecord | null) {
  if (!existing) {
    return createProjectRecord({
      id: options.projectId,
      title: options.projectTitle ?? humanize(options.projectId),
      description: options.projectDescription,
    });
  }
  return {
    ...existing,
    title: options.projectTitle ?? existing.title,
    description: options.projectDescription ?? existing.description,
  };
}

/**
 * Prepares one or more PNGs into `projects/<projectId>/` and updates project.json after each
 * image, so a failure part-way keeps every image that finished.
 */
export async function prepareProject(options: PrepareProjectOptions): Promise<ProjectRecord> {
  const { projectsRoot, projectId, images, quality, log } = options;
  const projectDir = path.join(projectsRoot, projectId);

  const existing = await readProjectManifest(projectDir);
  assertInputs(options, existing);
  let record = initialRecord(options, existing);

  for (const [index, image] of images.entries()) {
    log(`\n[${index + 1}/${images.length}] ${path.basename(image.sourcePath)} → ${image.imageId}`);
    const started = Date.now();
    const result = await prepareImage({ ...image, projectDir, quality, log });
    record = upsertImage(record, result.record);
    await writeProjectManifest(projectDir, record);

    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    log(
      `  Done in ${seconds}s — ${result.levels} levels, ${result.tileCount} tiles ` +
        `(${formatBytes(result.tileBytes)}), original ${formatBytes(result.record.originalBytes)}`,
    );
  }

  return record;
}
