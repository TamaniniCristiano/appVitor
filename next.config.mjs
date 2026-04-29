/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Build standalone: imagem Docker final fica ~150MB em vez de ~1.5GB
  output: 'standalone',
  async rewrites() {
    return [
      // Proxy: /api/* no front → backend Express
      // Assim navegador vê tudo na mesma origem (sem CORS)
      // e o Basic Auth do /api/admin funciona naturalmente
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
