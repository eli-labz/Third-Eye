import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Surface the Smart System feature flag to the client bundle under its exact
  // name so the same `ENABLE_MSS_SMART_SYSTEM_MODULE` check works on server
  // (API routes) and client (nav visibility). Defaults to off when unset.
  env: {
    ENABLE_MSS_SMART_SYSTEM_MODULE: process.env.ENABLE_MSS_SMART_SYSTEM_MODULE ?? '',
  },
  serverExternalPackages: ['ws'],
  transpilePackages: ['react-map-gl', 'mapbox-gl', 'maplibre-gl'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: wss: data: blob:;" },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
