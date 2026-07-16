/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@barber/shared'],
  images: {
    // Barber/salon avatars and cover photos live in the Supabase Storage
    // `avatars` bucket, served from the project's own Supabase domain.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
