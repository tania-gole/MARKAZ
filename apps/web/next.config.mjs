/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@markaz/types', '@markaz/db', '@markaz/adapters', '@markaz/core'],
};

export default nextConfig;
