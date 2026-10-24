import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // several lockfiles live above this folder — pin the root to this app
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
  reactStrictMode: false,
};

export default nextConfig;
