import 'server-only';

/** Plain-text error responses: short, human-readable, never a stack trace. */
export function notFoundResponse(message = 'Not found.'): Response {
  return new Response(message, {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function serverErrorResponse(context: string, error: unknown): Response {
  console.error(`[${context}]`, error);
  return new Response('Something went wrong. Please try again.', {
    status: 500,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
