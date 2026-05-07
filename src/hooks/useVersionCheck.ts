'use client'

import { useEffect, useRef } from 'react'

const POLL_INTERVAL_MS = 60_000 // check every 60 s when tab is visible
const LOCAL_KEY = 'mc_build_id'

export function useVersionCheck() {
  const currentBuild = process.env.NEXT_PUBLIC_BUILD_ID || 'dev'
  const prompted = useRef(false)

  useEffect(() => {
    // On first load, save the build ID that was baked into this bundle
    const stored = localStorage.getItem(LOCAL_KEY)
    if (!stored) {
      localStorage.setItem(LOCAL_KEY, currentBuild)
    }

    async function check() {
      if (prompted.current) return
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const { buildId } = await res.json()
        const stored = localStorage.getItem(LOCAL_KEY)

        // If the server has a newer build than what we loaded, force refresh
        if (stored && buildId && buildId !== stored) {
          prompted.current = true
          localStorage.setItem(LOCAL_KEY, buildId)
          window.location.reload()
        }
      } catch {
        // silently ignore network errors
      }
    }

    check()

    const interval = setInterval(() => {
      if (!document.hidden) check()
    }, POLL_INTERVAL_MS)

    const onFocus = () => check()
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [currentBuild])
}
