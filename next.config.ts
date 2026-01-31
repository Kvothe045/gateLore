import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... other config
  async headers() {
    return [
      {
        source: "/:path*", // This matches everything
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
        ],
      },
    ];
  },
};

export default nextConfig;