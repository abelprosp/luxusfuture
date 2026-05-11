/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["recharts"],
  async redirects() {
    return [
      { source: "/upload", destination: "/faturas/enviar", permanent: false },
      { source: "/relatorio", destination: "/relatorios", permanent: false },
    ];
  },
};

export default nextConfig;
