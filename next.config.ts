import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "enka.network", pathname: "/ui/**" },
    ],
  },
};

export default config;
