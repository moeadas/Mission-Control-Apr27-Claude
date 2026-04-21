'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useAgentsStore } from '@/lib/agents-store'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

const PUBLIC_PATHS = new Set(['/login'])
const ADMIN_ONLY_PREFIXES = ['/settings', '/config', '/skills', '/pipeline', '/users']

export function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
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
        router.replace('/login')
        setReady(true)
        return
      }

      if (session && PUBLIC_PATHS.has(pathname)) {
        router.replace('/dashboard')
        setReady(true)
        return
      }

      if (session) {
        const response = await fetch('/api/auth/session', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        if (response.ok) {
          const payload = await response.json()
          setAuthenticatedUser(payload?.user || null)
          if (
            payload?.user?.role !== 'super_admin' &&
            ADMIN_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
          ) {
            router.replace('/dashboard')
          }
        } else {
          setAuthenticatedUser(null)
        }
      } else {
        setAuthenticatedUser(null)
      }

      setReady(true)
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
  }, [pathname, router, setAuthenticatedUser, supabase])

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
