import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';

import { NO_STORE, attachmentDisposition, parseRangeHeader } from '@/lib/http/headers';
import { notFoundResponse, serverErrorResponse } from '@/lib/http/responses';
import { getAccessibleImage } from '@/lib/projects/repository';
import type { ImageRecord } from '@/lib/projects/types';
import { type OriginalSource, getStorage } from '@/lib/storage';

type Params = { projectId: string; imageId: string };
type FileSource = Extract<OriginalSource, { kind: 'file' }>;

const UNAVAILABLE = 'The original file is not available right now.';

/**
 * Download endpoint for the untouched original PNG. The viewer never loads this file; it is only
 * fetched when the visitor clicks "Download Original PNG". Supports HEAD (availability check
 * before downloading) and single byte ranges (resumable downloads on slow connections).
 */
async function handle(request: Request, params: Promise<Params>, includeBody: boolean) {
  const { projectId, imageId } = await params;

  try {
    const found = await getAccessibleImage(projectId, imageId, request);
    if (!found) return notFoundResponse(UNAVAILABLE);

    const source = await getStorage().resolveOriginal(projectId, imageId);
    if (!source) return notFoundResponse(UNAVAILABLE);

    if (source.kind === 'redirect') {
      return new Response(null, {
        status: 302,
        headers: { Location: source.url, 'Cache-Control': NO_STORE },
      });
    }
    return fileResponse(request, found.image, source, includeBody);
  } catch (error) {
    return serverErrorResponse('download', error);
  }
}

function fileResponse(
  request: Request,
  image: ImageRecord,
  source: FileSource,
  includeBody: boolean,
): Response {
  const etag = `"${image.originalSha256.slice(0, 32)}"`;
  const headers = new Headers({
    'Content-Type': 'image/png',
    'Content-Disposition': attachmentDisposition(image.downloadFileName),
    'Accept-Ranges': 'bytes',
    'Cache-Control': NO_STORE,
    ETag: etag,
    'Last-Modified': new Date(source.mtimeMs).toUTCString(),
  });

  // Only honour Range when If-Range (if sent) still matches this exact file.
  const ifRange = request.headers.get('if-range');
  const rangeHeader = !ifRange || ifRange === etag ? request.headers.get('range') : null;
  const range = parseRangeHeader(rangeHeader, source.size);

  if (range === 'unsatisfiable') {
    headers.set('Content-Range', `bytes */${source.size}`);
    return new Response(null, { status: 416, headers });
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? source.size - 1;
  headers.set('Content-Length', String(end - start + 1));
  if (range) headers.set('Content-Range', `bytes ${start}-${end}/${source.size}`);

  const status = range ? 206 : 200;
  if (!includeBody) return new Response(null, { status, headers });

  // Stream from disk: the 200 MB+ file is never buffered in server memory.
  const stream = Readable.toWeb(createReadStream(source.path, { start, end }));
  return new Response(stream as ReadableStream<Uint8Array>, { status, headers });
}

export function GET(request: Request, { params }: { params: Promise<Params> }) {
  return handle(request, params, true);
}

export function HEAD(request: Request, { params }: { params: Promise<Params> }) {
  return handle(request, params, false);
}
