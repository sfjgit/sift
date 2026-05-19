// import type { NextConfig } from 'next';

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
  /* config options here */
  reactStrictMode: false,
};

export default nextConfig;
