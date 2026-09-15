import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent deployment skew — links client-side JS to the correct
  // server action hashes so users with cached pages don't get
  // "Failed to find Server Action" errors after a new deploy.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID || undefined,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "*.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      // Vercel serves production at both the custom domain and
      // *.vercel.app — keep the duplicate out of search indexes
      // (Vercel's own duplicate-content guidance).
      {
        source: "/(.*)",
        has: [
          { type: "host", value: "chirplymint.vercel.app" },
        ],
        headers: [
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
