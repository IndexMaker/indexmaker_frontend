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
};

export default nextConfig;
