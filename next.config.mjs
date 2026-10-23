/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      const backendPort = process.env.BACKEND_PORT || "8000";
      return [
        {
          source: "/api/:path*",
          destination: `http://127.0.0.1:${backendPort}/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
