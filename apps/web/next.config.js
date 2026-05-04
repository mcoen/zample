/** @type {import('next').NextConfig} */
const gatewayInternalUrl = process.env.API_GATEWAY_INTERNAL_URL || "http://127.0.0.1:4000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${gatewayInternalUrl}/api/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
