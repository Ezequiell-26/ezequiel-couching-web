import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["preview-chat-c4052c27-31cc-4687-9443-1fc885b02864.space-z.ai", "localhost:3000"],
  images: { formats: ["image/avif", "image/webp"] },
};

export default nextConfig;
