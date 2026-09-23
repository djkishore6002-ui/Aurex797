/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  // GitHub Pages static snapshot mode (`SOLAI_STATIC=1 npm run build`
  // produces `.next/out`). Server-only routes (APIs, admin, auth) are
  // trimmed by scripts/export-snapshot.sh before the export build.
  output: process.env.SOLAI_STATIC === '1' ? 'export' : undefined,
};

export default nextConfig;
