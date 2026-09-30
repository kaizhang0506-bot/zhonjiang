import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.dev.coze.site'],
}

if (process.env.SITES_STATIC_EXPORT === '1') {
  nextConfig.output = 'export'
}

export default nextConfig
