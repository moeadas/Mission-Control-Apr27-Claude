import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import { SessionGate } from '@/components/auth/SessionGate'
import '@/styles/globals.css'

const heading = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' })
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: "Moe's Mission Control",
  description: "Creative & Digital Marketing Agency Command Center — powered by ClawX AI",
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${heading.variable} ${body.variable} ${mono.variable} bg-base text-text-primary font-body antialiased`}>
        <SessionGate>{children}</SessionGate>
      </body>
    </html>
  )
}
