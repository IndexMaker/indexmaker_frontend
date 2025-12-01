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
  // Rewrites are handled by API route for better control
  // Keeping this as fallback for non-mint_invoices endpoints
  async rewrites() {
    // Only use rewrites for non-invoice endpoints
    // Invoice endpoints are handled by app/api/issuer/[...path]/route.ts
    return [
      {
        source: "/api/issuer/:path((?!mint_invoices).)*",
        destination: "https://www.indexmaker.global/api/v1/:path*",
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
