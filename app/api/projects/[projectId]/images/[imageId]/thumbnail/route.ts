import { IMMUTABLE_CACHE, SHORT_CACHE } from '@/lib/http/headers';
import { notFoundResponse, serverErrorResponse } from '@/lib/http/responses';
import { THUMBNAIL_FILE, imageKey } from '@/lib/projects/layout';
import { getAccessibleImage } from '@/lib/projects/repository';
import { getStorage } from '@/lib/storage';

type Params = { projectId: string; imageId: string };

/** Small (≤512 px) WebP preview used by the image switcher. */
export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { projectId, imageId } = await params;

  try {
    const found = await getAccessibleImage(projectId, imageId, request);
    if (!found) return notFoundResponse();

    const data = await getStorage().readBinary(imageKey(projectId, imageId, THUMBNAIL_FILE));
    if (!data) return notFoundResponse();

    const versioned = new URL(request.url).searchParams.get('v') === found.image.version;
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': String(data.byteLength),
        'Cache-Control': versioned ? IMMUTABLE_CACHE : SHORT_CACHE,
      },
    });
  } catch (error) {
    return serverErrorResponse('thumbnail', error);
  }
}
