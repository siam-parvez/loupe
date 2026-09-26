import 'server-only';

import type { ProjectRecord } from './types';

/**
 * Single place that decides whether the current visitor may see a project and its files.
 * Called by the viewer page, tile/thumbnail routes and the download route.
 *
 * Today every project is public. To add private client projects later, extend `ProjectAccess`
 * (e.g. `{ mode: 'password', passwordHash }`), read a session cookie from `request` here, and
 * return false when it is missing — all callers already respond with a 404.
 */
export async function canViewProject(project: ProjectRecord, request?: Request): Promise<boolean> {
  void request;
  switch (project.access.mode) {
    case 'public':
      return true;
    default:
      return false;
  }
}
