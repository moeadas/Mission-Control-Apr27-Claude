'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ClientShell } from '@/components/ClientShell'
import { useAgentsStore } from '@/lib/agents-store'
import { getStoredToken } from '@/lib/auth/browser'

// Dynamic import with ssr: false — prevents Turbopack from bundling konva
// (a canvas-based lib) in the server-side render pass.
const OfficeBuilder = dynamic(
  () => import('@/components/office/OfficeBuilder').then(m => ({ default: m.OfficeBuilder })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-white/40 text-sm">
        Loading Office Builder…
      </div>
    ),
  }
)

export default function OfficePage() {
  const currentUser = useAgentsStore((s) => s.currentUser)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    if (currentUser?.role) {
      setIsSuperAdmin(currentUser.role === 'super_admin')
      return
    }
    const token = getStoredToken()
    if (!token) return
    let active = true
    fetch('/api/auth/session', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (active) setIsSuperAdmin(data?.user?.role === 'super_admin') })
      .catch(() => {})
    return () => { active = false }
  }, [currentUser?.role])

  return (
    <ClientShell>
      <div className="mission-shell h-full overflow-hidden p-4 md:p-6">
        <OfficeBuilder isSuperAdmin={isSuperAdmin} />
      </div>
    </ClientShell>
  )
}
