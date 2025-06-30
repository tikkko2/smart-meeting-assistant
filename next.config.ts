import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: ['socket.io', 'ws'],
  webpack: (config) => {
    // Add support for WebSocket connections
    config.externals = [...(config.externals || []), 'ws', 'socket.io'];
    return config;
  },
};

export default nextConfig;
