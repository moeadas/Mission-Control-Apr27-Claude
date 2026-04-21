'use client'

import React from 'react'
import { ClientShell } from '@/components/ClientShell'
import { OfficeFloor } from '@/components/office/OfficeFloor'

export default function OfficePage() {
  return (
    <ClientShell>
      <div className="mission-shell h-full overflow-hidden p-4 md:p-6">
        <OfficeFloor />
      </div>
    </ClientShell>
  )
}
