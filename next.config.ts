import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "cdn.morpho.org",
      "www.countryflags.io",
      "coin-images.coingecko.com",
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/issuer/:path*",
        destination: "https://issuer-network-1.indexmaker.global/api/v1/:path*",
      },
    ];
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // swcMinify is enabled by default in Next.js 15+
};

export default nextConfig;
