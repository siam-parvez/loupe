import { IMMUTABLE_CACHE } from '@/lib/http/headers';
import { notFoundResponse, serverErrorResponse } from '@/lib/http/responses';
import { tileKey } from '@/lib/projects/layout';
import { getAccessibleImage } from '@/lib/projects/repository';
import { isValidLevel, isValidTileFile, isValidVersion } from '@/lib/projects/validation';
import { getStorage } from '@/lib/storage';

type Params = { projectId: string; imageId: string; version: string; level: string; tile: string };

/**
 * Serves one Deep Zoom tile for the local storage driver:
 *   /api/projects/<projectId>/images/<imageId>/tiles/<version>/<level>/<col>_<row>.webp
 * The version segment changes whenever the image is re-prepared, so tiles can be cached forever.
 */
export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { projectId, imageId, version, level, tile } = await params;
  if (!isValidVersion(version) || !isValidLevel(level) || !isValidTileFile(tile)) {
    return notFoundResponse();
  }

  try {
    const found = await getAccessibleImage(projectId, imageId, request);
    if (!found || found.image.version !== version) return notFoundResponse();

    const data = await getStorage().readBinary(tileKey(projectId, imageId, Number(level), tile));
    if (!data) return notFoundResponse();

    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': String(data.byteLength),
        'Cache-Control': IMMUTABLE_CACHE,
      },
    });
  } catch (error) {
    return serverErrorResponse('tiles', error);
  }
}
