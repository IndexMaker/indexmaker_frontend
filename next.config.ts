import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "cdn.morpho.org",
      "www.countryflags.io",
      "coin-images.coingecko.com",
    ],
    // Optimize image loading
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Optimize production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Optimize React in production
  reactStrictMode: true,
  // Compress responses
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optimize chunk splitting
  experimental: {
    optimizePackageImports: ['framer-motion', 'react-responsive'],
  },
};

export default nextConfig;
