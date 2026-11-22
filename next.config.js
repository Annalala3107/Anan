/** @type {import('next').NextConfig} */
const buildId =
  (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 10) ||
  Date.now().toString(36);

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  env: {
    ANANQUIZ_BUILD_ID: buildId,
  },
}

module.exports = nextConfig
