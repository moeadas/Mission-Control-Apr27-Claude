'use client'

import React, { useState, useEffect } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { OfficeBuilder } from '@/components/office/OfficeBuilder'
import { useAgentsStore } from '@/lib/agents-store'
import { getStoredToken } from '@/lib/auth/browser'

export default function OfficePage() {
  const currentUser = useAgentsStore((s) => s.currentUser)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    // Fast path: role already in store
    if (currentUser?.role) {
      setIsSuperAdmin(currentUser.role === 'super_admin')
      return
    }

    // Fallback: fetch from session API
    const token = getStoredToken()
    if (!token) return

    let active = true
    fetch('/api/auth/session', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (active) setIsSuperAdmin(data?.user?.role === 'super_admin')
      })
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
