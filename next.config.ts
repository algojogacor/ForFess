import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Satori memuat WASM harfbuzz dari node_modules-nya sendiri; kalau
  // dibundle oleh Turbopack/webpack, path hb.wasm jadi rusak.
  // Sama halnya sharp & cloudinary — aman dijalankan sebagai external.
  serverExternalPackages: ["satori", "sharp", "cloudinary"],
};

export default nextConfig;
