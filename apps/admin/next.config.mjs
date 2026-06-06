/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@markaz/types', '@markaz/db', '@markaz/adapters', '@markaz/core', '@markaz/auth'],
  serverExternalPackages: ['@node-rs/argon2', '@prisma/client'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize native-binary packages so webpack doesn't try to bundle their
      // platform-specific .node files. transpilePackages on @markaz/auth makes
      // serverExternalPackages alone insufficient, so we belt-and-braces here.
      config.externals = [
        ...(config.externals || []),
        ({ request }, callback) => {
          if (
            request &&
            (request === '@node-rs/argon2' ||
              /^@node-rs\/argon2-/.test(request) ||
              /\.node$/.test(request))
          ) {
            return callback(null, 'commonjs ' + request);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
