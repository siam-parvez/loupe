import 'server-only';

import { cache } from 'react';

import { BRAND } from '@/lib/brand';
import { InvalidDziError, parseDzi } from '@/lib/images/dzi';
import { getStorage } from '@/lib/storage';

import { canViewProject } from './access';
import { DZI_FILE, PROJECT_FILE, imageKey, projectKey } from './layout';
import type {
  DziInfo,
  ImageRecord,
  ProjectRecord,
  ViewerImageState,
  ViewerImageSummary,
  ViewerPayload,
} from './types';
import { isValidId, parseProjectRecord } from './validation';

/** Loads and validates `project.json`. Returns `null` for unknown or malformed IDs. */
export const getProject = cache(async (projectId: string): Promise<ProjectRecord | null> => {
  if (!isValidId(projectId)) return null;

  const raw = await getStorage().readText(projectKey(projectId, PROJECT_FILE));
  if (raw === null) return null;

  const record = parseProjectRecord(JSON.parse(raw) as unknown);
  if (record.id !== projectId) {
    throw new Error(`project.json id "${record.id}" does not match folder "${projectId}"`);
  }
  return record;
});

/**
 * Resolves a project + image for asset routes (tiles, thumbnail, download), applying the access
 * policy. Returns `null` for anything the visitor must not see, so routes can answer 404.
 */
export async function getAccessibleImage(
  projectId: string,
  imageId: string,
  request: Request,
): Promise<{ project: ProjectRecord; image: ImageRecord } | null> {
  if (!isValidId(projectId) || !isValidId(imageId)) return null;
  const project = await getProject(projectId);
  if (!project || !(await canViewProject(project, request))) return null;
  const image = project.images.find((entry) => entry.id === imageId);
  return image ? { project, image } : null;
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const ids = await getStorage().listProjectIds();
  const projects = await Promise.all(
    ids.map((id) =>
      getProject(id).catch((error: unknown) => {
        console.error(`[projects] Skipping "${id}":`, error);
        return null;
      }),
    ),
  );
  return projects.filter((project): project is ProjectRecord => project !== null);
}

export async function getImageDzi(projectId: string, imageId: string): Promise<DziInfo | null> {
  const xml = await getStorage().readText(imageKey(projectId, imageId, DZI_FILE));
  return xml === null ? null : parseDzi(xml);
}

export function viewerHref(projectId: string, imageId: string): string {
  return `/viewer/${projectId}/${imageId}`;
}

export function downloadHref(projectId: string, imageId: string): string {
  return `/api/projects/${projectId}/images/${imageId}/download`;
}

function toSummary(project: ProjectRecord, image: ImageRecord): ViewerImageSummary {
  return {
    id: image.id,
    title: image.title,
    width: image.width,
    height: image.height,
    thumbnailUrl: getStorage().thumbnailUrl(project.id, image.id, image.version),
    href: viewerHref(project.id, image.id),
  };
}

const PREPARING_MESSAGE =
  'This artwork is still being prepared for viewing. Please check back in a few minutes.';
const BROKEN_MESSAGE = `This artwork could not be opened. Please email ${BRAND.email} so we can fix it.`;

async function resolveImageState(
  project: ProjectRecord,
  image: ImageRecord,
): Promise<ViewerImageState> {
  try {
    const dzi = await getImageDzi(project.id, image.id);
    if (!dzi) return { status: 'unavailable', message: PREPARING_MESSAGE };

    return {
      status: 'ready',
      tileSource: {
        url: getStorage().tileBaseUrl(project.id, image.id, image.version),
        width: dzi.width,
        height: dzi.height,
        tileSize: dzi.tileSize,
        overlap: dzi.overlap,
        format: dzi.format,
      },
      downloadUrl: downloadHref(project.id, image.id),
      downloadFileName: image.downloadFileName,
      originalBytes: image.originalBytes,
    };
  } catch (error) {
    const label = error instanceof InvalidDziError ? 'Invalid DZI' : 'Failed to load DZI';
    console.error(`[viewer] ${label} for ${project.id}/${image.id}:`, error);
    return { status: 'unavailable', message: BROKEN_MESSAGE };
  }
}

export type ViewerLookup =
  | { kind: 'not-found' }
  | { kind: 'empty'; project: ProjectRecord }
  | { kind: 'ok'; payload: ViewerPayload };

/** Everything the viewer page needs. `imageId` omitted → first image of the project. */
export async function getViewerPayload(projectId: string, imageId?: string): Promise<ViewerLookup> {
  const project = await getProject(projectId);
  if (!project || !(await canViewProject(project))) return { kind: 'not-found' };
  if (project.images.length === 0) return { kind: 'empty', project };

  const currentIndex = imageId ? project.images.findIndex((image) => image.id === imageId) : 0;
  const image = project.images[currentIndex];
  if (!image) return { kind: 'not-found' };

  return {
    kind: 'ok',
    payload: {
      project: { id: project.id, title: project.title, description: project.description },
      images: project.images.map((entry) => toSummary(project, entry)),
      current: {
        ...toSummary(project, image),
        description: image.description,
        state: await resolveImageState(project, image),
      },
      currentIndex,
    },
  };
}
