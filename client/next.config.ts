import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '4000' },
      { protocol: 'http', hostname: '192.168.137.1', port: '4000' },
      { protocol: 'http', hostname: '192.168.2.1', port: '4000' },
    ],
  },
};

export default nextConfig;
