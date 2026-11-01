/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/*': ['./prisma/dev.db', './prisma/schema.prisma'],
    '/**/*': ['./prisma/dev.db', './prisma/schema.prisma'],
    '/api/**/*': ['./prisma/dev.db', './prisma/schema.prisma'],
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: false,
      },
      {
        source: '/home',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
