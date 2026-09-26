import type { NextConfig } from 'next';

/** Optional home-page redirect for a public showcase deployment, e.g. VIEWER_HOME_REDIRECT=/viewer/demo. */
const homeRedirect = process.env.VIEWER_HOME_REDIRECT?.trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow `next dev` assets/HMR when the site is opened through a temporary ngrok tunnel.
  // Only affects development; production (`next start`) does not need it.
  // The `static` storage driver (hosted demo) reads project.json / artwork.dzi from public/ at
  // request time, so ship those small files with every server function.
  outputFileTracingIncludes: {
    '/**': ['./public/static-projects/**/*.json', './public/static-projects/**/*.dzi'],
  },
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok-free.dev', '*.ngrok.app', '*.ngrok.io'],
  async redirects() {
    return homeRedirect?.startsWith('/')
      ? [{ source: '/', destination: homeRedirect, permanent: false }]
      : [];
  },
  async headers() {
    return [
      {
        // Demo tiles/thumbnails/originals served straight from the CDN.
        source: '/static-projects/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
