'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Activity, Menu, Sun, Moon, RefreshCcw, LogOut } from 'lucide-react'
import { useAgentsStore } from '@/lib/agents-store'
import { clearStoredToken } from '@/lib/auth/browser'
import { clsx } from 'clsx'

interface TopBarProps {
  onMobileMenuToggle?: () => void
}

export function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const [time, setTime] = useState('')
  const themeMode = useAgentsStore((state) => state.agencySettings.themeMode)
  const setThemeMode = useAgentsStore((state) => state.setThemeMode)
  const missions = useAgentsStore((state) => state.missions)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const activeMissionCount = missions.filter((mission) => mission.status !== 'completed').length

  const hardRefreshApp = async () => {
    if (typeof window === 'undefined') return

    try {
      if ('caches' in window) {
        const keys = await window.caches.keys()
        await Promise.all(keys.map((key) => window.caches.delete(key)))
      }
    } catch {}

    const url = new URL(window.location.href)
    url.searchParams.set('refresh', String(Date.now()))
    window.location.replace(url.toString())
  }

  return (
    <header className="glass mission-shell h-16 border-b border-[var(--border)] flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            console.log('🍔 Hamburger clicked!')
            onMobileMenuToggle?.()
          }}
          className="flex md:hidden p-2 -ml-2 rounded-xl hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-3">
          <Image
            src="/branding/mission-control-logo.png"
            alt="Mission Control logo"
            width={44}
            height={44}
            className="h-11 w-11 object-contain drop-shadow-[0_10px_18px_rgba(199,48,48,0.16)]"
            priority
          />
          <div className="block">
            <h1 className="text-base font-semibold leading-tight text-slate-900">
              Command Center
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-dim)]">
              {activeMissionCount} active mission{activeMissionCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-2 shadow-[0_10px_24px_rgba(45,78,135,0.08)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-green)] shadow-[0_0_12px_var(--accent-green)]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">Systems Stable</span>
        </div>
        <button
          onClick={hardRefreshApp}
          className={clsx(
            'hidden md:flex items-center justify-center w-11 h-11 rounded-[18px]',
            'transition-colors duration-200',
            'text-[var(--text-secondary)] bg-white/60 border border-white/60 shadow-[0_10px_24px_rgba(45,78,135,0.08)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
          )}
          aria-label="Refresh latest app version"
          title="Refresh latest app version"
        >
          <RefreshCcw size={16} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          className={clsx(
            'flex items-center justify-center w-11 h-11 rounded-[18px]',
            'transition-colors duration-200',
            'text-[var(--text-secondary)] bg-white/60 border border-white/60 shadow-[0_10px_24px_rgba(45,78,135,0.08)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]',
            'focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-panel)]'
          )}
          aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={() => {
            clearStoredToken()
            window.location.href = '/login'
          }}
          className={clsx(
            'flex items-center justify-center w-11 h-11 rounded-[18px]',
            'transition-colors duration-200',
            'text-[var(--text-secondary)] bg-white/60 border border-white/60 shadow-[0_10px_24px_rgba(45,78,135,0.08)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
          )}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>

        {/* Time */}
        <div className="hidden sm:block text-right rounded-full border border-white/60 bg-white/72 px-3 py-2 shadow-[0_10px_24px_rgba(45,78,135,0.08)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-dim)]">Madrid</p>
          <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{time}</p>
        </div>
      </div>
    </header>
  )
}
