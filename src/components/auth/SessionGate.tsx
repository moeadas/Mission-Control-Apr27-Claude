'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import { useAgentsStore } from '@/lib/agents-store'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

const PUBLIC_PATHS = new Set(['/login'])
const ADMIN_ONLY_PREFIXES = ['/settings', '/config', '/skills', '/pipeline', '/users']

/**
 * Hard navigation helper that bypasses Next's client-side Router.
 *
 * Why this matters: previously SessionGate used `router.replace()` from
 * `next/navigation` to redirect unauthenticated users to /login or send
 * authenticated users away from /login. Inside Next 16's app router, that
 * call mutates the App Router's segment cache. When the redirect fires from
 * inside our `useEffect` while the AppRouter is still mid-render, Next's
 * internal `Router` component renders with a different segment count
 * between passes — and React reports it as `Rendered more hooks than during
 * the previous render`.
 *
 * Forcing a full document load avoids the in-process Router state churn.
 * Equivalent to the post-login redirect pattern the login page already uses.
 */
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
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [ready, setReady] = useState(false)
  const setAuthenticatedUser = useAgentsStore((state) => state.setAuthenticatedUser)

  useEffect(() => {
    let mounted = true

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (!session && !PUBLIC_PATHS.has(pathname)) {
        setAuthenticatedUser(null)
        hardRedirect('/login')
        return
      }

      if (session && PUBLIC_PATHS.has(pathname)) {
        hardRedirect('/dashboard')
        return
      }

      if (session) {
        try {
          const response = await fetch('/api/auth/session', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })
          if (response.ok) {
            const payload = await response.json()
            if (!mounted) return
            setAuthenticatedUser(payload?.user || null)
            if (
              payload?.user?.role !== 'super_admin' &&
              ADMIN_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
            ) {
              hardRedirect('/dashboard')
              return
            }
          } else if (mounted) {
            setAuthenticatedUser(null)
          }
        } catch {
          if (mounted) setAuthenticatedUser(null)
        }
      } else if (mounted) {
        setAuthenticatedUser(null)
      }

      if (mounted) setReady(true)
    }

    syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      syncSession()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [pathname, setAuthenticatedUser, supabase])

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
