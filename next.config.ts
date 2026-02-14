import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Force headers on ALL routes (Regex matching everything)
  async headers() {
    return [
      {
        source: "/(.*)", 
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'practicepaper.in',
      },
    ],
  },
  
  // 2. Ensure we don't leak "Powered By Next.js"
  poweredByHeader: false,
  
  // 3. Strict React mode helps catch bugs
  reactStrictMode: true,
};

export default nextConfig;