import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['stripe', '@anthropic-ai/sdk'],
};

export default nextConfig;
