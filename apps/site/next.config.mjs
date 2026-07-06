/**
 * Static export — the marketing site is pure content, so it deploys anywhere
 * (Vercel, Cloudflare Pages, an S3 bucket) with no server.
 */
const nextConfig = {
  output: 'export',
};

export default nextConfig;
