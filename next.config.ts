import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "r2.ensana-media.twodo.cz",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
