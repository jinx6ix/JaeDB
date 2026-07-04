// next.config.mjs  — ESM for Next.js 16 + package "type":"module"
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  experimental: {},
};

export default nextConfig;
