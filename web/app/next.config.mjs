import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'dist',
  reactStrictMode: false,
  allowedDevOrigins: ['10.10.18.71'],
  assetPrefix: '/panda-wiki-app-assets',
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ['mermaid'],
  async headers() {
    return [
      {
        source: '/cap@0.0.6/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, must-revalidate',
          },
        ],
      },
    ];
  },
  async rewrites() {
    const rewritesPath = [];
    if (process.env.NODE_ENV === 'development') {
      rewritesPath.push(
        ...[
          {
            source: '/static-file/:path*',
            destination: `${process.env.STATIC_FILE_TARGET}/static-file/:path*`,
            basePath: false,
          },
          {
            source: '/share/v1/:path*',
            destination: `${process.env.TARGET}/share/v1/:path*`,
            basePath: false,
          },
        ],
      );
    }
    return rewritesPath;
  },
};

const isDevelopment = process.env.NODE_ENV === 'development';

export default isDevelopment
  ? nextConfig
  : withSentryConfig(nextConfig, {
      org: 'sentry',
      project: 'pandawiki-app',
      sentryUrl: 'https://sentry.baizhi.cloud/',
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: '/monitoring',
      disableLogger: true,
      automaticVercelMonitors: true,
    });
