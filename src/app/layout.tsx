import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: '中奖 2.0版本',
  description: '基于历史记录的数字回合参考工具',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>
}
