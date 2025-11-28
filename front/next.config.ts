import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",              // caminho no frontend
        destination: "http://localhost:3001/:path*", // backend real
      },
    ];
  },
};

export default nextConfig;
