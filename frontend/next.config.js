/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Railway 部署时不使用 export 模式，使用服务器模式
  // output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // 配置环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
  // 跳过动态路由的构建时检查
  skipTrailingSlashRedirect: true,
}

module.exports = nextConfig

