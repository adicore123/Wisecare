/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()'
          }
        ]
      }
    ];
  },
  async rewrites() {
    // Legacy dev-server proxy: only active in local development. In production it
    // would turn every unknown /api/* path into a connection-refused 500 instead
    // of a clean 404.
    if (process.env.NODE_ENV === 'production') {
      return { fallback: [] };
    }
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:5001/api/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
