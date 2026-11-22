import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is per-student and fully dynamic, so we use the classic
  // request-time rendering model instead of Cache Components.
  cacheComponents: false,
  serverExternalPackages: ["@node-rs/argon2", "pino", "@electric-sql/pglite"],
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
