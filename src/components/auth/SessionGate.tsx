'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

import { useAgentsStore } from '@/lib/agents-store'
import { getStoredToken, clearStoredToken } from '@/lib/auth/browser'

const PUBLIC_PATHS = new Set(['/login'])
const ADMIN_ONLY_PREFIXES = ['/settings', '/config', '/skills', '/pipeline', '/users']

function hardRedirect(target: string) {
  if (typeof window === 'undefined') return
  const url = new URL(target, window.location.origin)
  if (target === '/dashboard') {
    url.searchParams.set('refresh', String(Date.now()))
  }
  window.location.replace(url.toString())
}

export function SessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const setAuthenticatedUser = useAgentsStore((state) => state.setAuthenticatedUser)

  useEffect(() => {
    let mounted = true

    const syncSession = async () => {
      const token = getStoredToken()

      if (!token) {
        if (!PUBLIC_PATHS.has(pathname)) {
          setAuthenticatedUser(null)
          hardRedirect('/login')
          return
        }
        if (mounted) setReady(true)
        return
      }

      // Token exists — verify with server
      try {
        const response = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          // Token invalid/expired — clear it
          clearStoredToken()
          if (!mounted) return
          setAuthenticatedUser(null)
          if (!PUBLIC_PATHS.has(pathname)) {
            hardRedirect('/login')
            return
          }
        } else {
          const payload = await response.json()
          if (!mounted) return

          setAuthenticatedUser(payload?.user || null)

          if (PUBLIC_PATHS.has(pathname)) {
            hardRedirect('/dashboard')
            return
          }

          if (
            payload?.user?.role !== 'super_admin' &&
            ADMIN_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
          ) {
            hardRedirect('/dashboard')
            return
          }
        }
      } catch {
        if (mounted) setAuthenticatedUser(null)
      }

      if (mounted) setReady(true)
    }

    syncSession()
    return () => { mounted = false }
  }, [pathname, setAuthenticatedUser])

  if (!ready) {
    return (
      <div className="min-h-screen bg-base text-text-primary flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-heading font-semibold">Loading Mission Control…</p>
          <p className="text-xs text-text-dim mt-2">Checking your workspace access</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
