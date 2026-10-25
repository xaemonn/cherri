import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Lets a phone on the same Wi-Fi load the dev server (e.g. a scanned doctor-report QR).
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
  experimental: {
    // App pages sit behind a client-side sign-in gate, so the server never renders them and
    // automatic instant-navigation validation can't see them. Validate only opted-in segments.
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
