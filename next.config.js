import path from "path";
import { fileURLToPath } from "url";
import { withWorkflow } from "workflow/next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "consultingsr.com" }],
        destination: "https://www.consultingsr.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: "connect-src 'self' https://api.stripe.com https://*.stripe.com",
          },
        ],
      },
    ];
  },
  webpack: (config, { webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
      // Avoid xdg-app-paths' eager process.argv inference during Next 14
      // page-data collection in Workflow's generated internal routes.
      "xdg-app-paths": path.resolve(__dirname, "lib/shims/xdg-app-paths.cjs"),
    };
    // Workflow's server bundle includes Vercel config discovery, which reads
    // process.argv[0] during Next.js page-data collection. Next 14 omits that
    // value in the worker; provide the normal Node executable path at build time.
    config.plugins.push(
      new webpack.DefinePlugin({
        "process.argv[0]": JSON.stringify(process.execPath),
      })
    );
    return config;
  },
};

const workflowConfig = withWorkflow(nextConfig);

export default async function configuredNext(phase, context) {
  const config = await workflowConfig(phase, context);
  // Workflow adds a Turbopack configuration for newer Next releases.
  // Next 14 uses webpack and warns on this unsupported top-level key.
  delete config.turbopack;
  return config;
}
