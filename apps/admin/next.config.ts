import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@gestao-hb/core', '@gestao-hb/ui', '@gestao-hb/firebase'],
};

export default nextConfig;
