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
  // This conflicts with "app/api/issuer/[...path]/route.ts" and as a result in
  // dev and prod behavior differs, resulting in 404 in prod.
  // async rewrites() {
  //   return [
  //     {
  //       source: "/api/issuer/:path*",
  //       destination: "https://issuer-network-1.indexmaker.global/api/v1/:path*",
  //     },
  //   ];
  // },
};

export default nextConfig;
