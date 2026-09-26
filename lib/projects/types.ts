/**
 * Shared project/image types. Safe to import from server code, client code and CLI scripts.
 */

/**
 * Who may view a project. Only `public` exists today; add e.g.
 * `{ mode: 'password'; passwordHash: string }` later and handle it in `lib/projects/access.ts`.
 */
export type ProjectAccess = { mode: 'public' };

/** One artwork inside a project. Stored in `project.json`. */
export interface ImageRecord {
  id: string;
  title: string;
  description?: string;
  /** Filename offered to the browser when downloading the untouched original PNG. */
  downloadFileName: string;
  originalBytes: number;
  originalSha256: string;
  width: number;
  height: number;
  /** Changes every time the image is (re)prepared; used to cache-bust immutable tile URLs. */
  version: string;
  createdAt: string;
}

/** Contents of `projects/<projectId>/project.json`. */
export interface ProjectRecord {
  schemaVersion: 1;
  id: string;
  title: string;
  description?: string;
  access: ProjectAccess;
  /** Display order is array order. */
  images: ImageRecord[];
  updatedAt: string;
}

/** Tile geometry parsed from an `artwork.dzi` descriptor. */
export interface DziInfo {
  width: number;
  height: number;
  tileSize: number;
  overlap: number;
  format: string;
}

/** Everything the browser needs to render one image with OpenSeadragon. */
export interface ViewerTileSource {
  /** Base URL of the tile pyramid, ending in `/`. Tiles live at `<url><level>/<col>_<row>.<format>`. */
  url: string;
  width: number;
  height: number;
  tileSize: number;
  overlap: number;
  format: string;
}

/** Lightweight entry for the image switcher. */
export interface ViewerImageSummary {
  id: string;
  title: string;
  width: number;
  height: number;
  thumbnailUrl: string;
  href: string;
}

export type ViewerImageState =
  | {
      status: 'ready';
      tileSource: ViewerTileSource;
      downloadUrl: string;
      downloadFileName: string;
      originalBytes: number;
    }
  | { status: 'unavailable'; message: string };

export interface ViewerPayload {
  project: { id: string; title: string; description?: string };
  images: ViewerImageSummary[];
  current: ViewerImageSummary & { description?: string; state: ViewerImageState };
  currentIndex: number;
}
