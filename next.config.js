/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/r/:community/comments/:pid', destination: '/community/:community/comments/:pid', permanent: false },
      { source: '/r/:community/submit', destination: '/community/:community/submit', permanent: false },
      { source: '/r/:community', destination: '/community/:community', permanent: false },
    ];
  },
};

module.exports = nextConfig
