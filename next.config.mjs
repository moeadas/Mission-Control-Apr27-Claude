import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Stamp the build with a unique ID so the client can detect new deployments
const BUILD_ID = Date.now().toString()

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  reactStrictMode: true,
  // Required for Docker standalone build (node server.js)
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico|uploads).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ]
  },
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
