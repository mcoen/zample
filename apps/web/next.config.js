/** @type {import('next').NextConfig} */
function normalizeGatewayOrigin(rawValue) {
  const fallback = "http://127.0.0.1:4000";
  const candidate = String(rawValue || "").trim();

  if (!candidate) {
    return fallback;
  }

  try {
    return new URL(candidate).origin;
  } catch {
    return fallback;
  }
}

const gatewayInternalOrigin = normalizeGatewayOrigin(process.env.API_GATEWAY_INTERNAL_URL);

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/launches/:path*",
        destination: `${gatewayInternalOrigin}/api/launches/:path*`
      },
      {
        source: "/api/tasks/:path*",
        destination: `${gatewayInternalOrigin}/api/tasks/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
