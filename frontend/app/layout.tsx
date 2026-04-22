import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import HashRouter from './hash-router'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EvoNarrator - 面向可行假设生成的科学演化建模',
  description: '基于深度分析的论文知识图谱构建与演化路径可视化系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <HashRouter />
        {children}
      </body>
    </html>
  )
}

