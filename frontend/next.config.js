/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cv-management.sgp1.digitaloceanspaces.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;