import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Zero SEO: Headers that block everything
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "Referrer-Policy", value: "no-referrer" }, // Don't leak origin
          { key: "X-Frame-Options", value: "DENY" }, // No iframes
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  
  // 2. Strict Images (No external hotlinking)
  images: {
    domains: [],
    unoptimized: true, 
  },

  // 3. Disable Powered By Header (Hides Next.js signature)
  poweredByHeader: false,
};

export default nextConfig;