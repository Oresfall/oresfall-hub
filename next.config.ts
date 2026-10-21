import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // Abaikan error tipe saat Vercel melakukan build
    ignoreBuildErrors: true,
  },
  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;