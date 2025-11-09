import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable caching during development to ensure fresh builds
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Generate ETag headers to force cache validation
  generateEtags: true,
  // Add headers to control caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
