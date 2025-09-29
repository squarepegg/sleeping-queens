/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  webpack: (config) => {
    // Ignore test files in the build
    config.module.rules.push({
      test: /\.test\.(ts|tsx|js|jsx)$/,
      use: 'ignore-loader'
    });
    return config;
  }
}

module.exports = nextConfig