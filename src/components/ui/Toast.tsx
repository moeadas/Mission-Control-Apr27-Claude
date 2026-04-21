'use client'

import React, { useState } from 'react'
import { Check, AlertCircle, Info, X } from 'lucide-react'
import { clsx } from 'clsx'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

let toastId = 0
type Listener = (toasts: Toast[]) => void
const listeners: Listener[] = []
let toastQueue: Toast[] = []

function notify() {
  listeners.forEach((l) => l([...toastQueue]))
}

export const toast = {
  success: (message: string) => {
    const t = { id: String(++toastId), message, type: 'success' as ToastType }
    toastQueue = [...toastQueue, t]
    notify()
    setTimeout(() => {
      toastQueue = toastQueue.filter((x) => x.id !== t.id)
      notify()
    }, 4000)
  },
  error: (message: string) => {
    const t = { id: String(++toastId), message, type: 'error' as ToastType }
    toastQueue = [...toastQueue, t]
    notify()
    setTimeout(() => {
      toastQueue = toastQueue.filter((x) => x.id !== t.id)
      notify()
    }, 4000)
  },
  info: (message: string) => {
    const t = { id: String(++toastId), message, type: 'info' as ToastType }
    toastQueue = [...toastQueue, t]
    notify()
    setTimeout(() => {
      toastQueue = toastQueue.filter((x) => x.id !== t.id)
      notify()
    }, 4000)
  },
}

const ICONS = {
  success: <Check size={14} />,
  error: <AlertCircle size={14} />,
  info: <Info size={14} />,
}

const COLORS = {
  success: { bg: 'bg-accent-cyan/10', border: 'border-accent-cyan/30', text: 'text-accent-cyan' },
  error: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  info: { bg: 'bg-accent-blue/10', border: 'border-accent-blue/30', text: 'text-accent-blue' },
}

export function ToastContainer() {
  const [local, setLocal] = useState<Toast[]>([])

  React.useEffect(() => {
    const listener: Listener = (toasts) => setLocal([...toasts])
    listeners.push(listener)
    return () => {
      const idx = listeners.indexOf(listener)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {local.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium shadow-lg animate-slide-up pointer-events-auto',
            COLORS[t.type].bg,
            COLORS[t.type].border
          )}
        >
          <span className={COLORS[t.type].text}>{ICONS[t.type]}</span>
          <span className="text-text-primary">{t.message}</span>
          <button
            onClick={() => {
              toastQueue = toastQueue.filter((x) => x.id !== t.id)
              notify()
            }}
            className="ml-2 text-text-dim hover:text-text-primary transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
