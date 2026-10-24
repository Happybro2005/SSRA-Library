import type { NextConfig } from "next";
import path from "path";

// next-intl's plugin only aliases "next-intl/config" to our request config. We set the alias directly
// because the plugin also loads a native @swc/core addon that fails to load on some Windows machines.
const I18N_REQUEST = "./src/i18n/request.ts";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "510mb" },
    // Requests to /admin pass through middleware (login check), which otherwise cuts bodies off at 10 MB.
    middlewareClientMaxBodySize: "510mb",
  },
  turbopack: {
    resolveAlias: { "next-intl/config": I18N_REQUEST },
  },
  webpack(config) {
    config.resolve.alias["next-intl/config"] = path.resolve(I18N_REQUEST);
    return config;
  },
};

export default nextConfig;
