import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/hertz-wo",
  images: { unoptimized: true },
};

export default nextConfig;
