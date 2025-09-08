/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  env: {
    PORT: process.env.PORT || '3007',
  },
  // Ensure consistent port usage
  devIndicators: {
    buildActivity: true,
  },
  // Enable experimental features for better development experience
  experimental: {
    // Enable faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

module.exports = nextConfig;
