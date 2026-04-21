'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Bot,
  ListTodo,
  FileText,
  Users,
  Settings,
  GitBranch,
  BarChart3,
  BookOpen,
  Shield,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { getSupabaseAccessToken } from '@/lib/supabase/browser'
import { useAgentsStore } from '@/lib/agents-store'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', color: '#60a5fa' },
  { id: 'office', label: 'Virtual Office', icon: Building2, href: '/office', color: '#2dd4bf' },
  { id: 'agents', label: 'Agents', icon: Bot, href: '/agents', color: '#a78bfa' },
  { id: 'clients', label: 'Clients', icon: Users, href: '/clients', color: '#fbbf24' },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, href: '/tasks', color: '#fb923c' },
  { id: 'pipeline', label: 'Pipeline', icon: GitBranch, href: '/pipeline', color: '#2dd4bf' },
  { id: 'skills', label: 'Skills', icon: BookOpen, href: '/skills', color: '#fbbf24' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/analytics', color: '#a78bfa' },
  { id: 'outputs', label: 'Outputs', icon: FileText, href: '/outputs', color: '#60a5fa' },
  { id: 'users', label: 'Users', icon: Shield, href: '/users', color: '#f472b6' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings', color: '#71717a' },
]

const ADMIN_ONLY_IDS = new Set(['pipeline', 'skills', 'users', 'settings'])

interface SidebarProps {
  collapsed?: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
}

function NavItem({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: (typeof NAV_ITEMS)[0]
  isActive: boolean
  collapsed?: boolean
  onClick?: () => void
}) {
  const Icon = item.icon

  return (
    <Link
      key={item.id}
      href={item.href}
      onClick={onClick}
      className={clsx(
        'group relative flex items-center gap-3 rounded-[18px] transition-all duration-150 min-h-[46px]',
        isActive
          ? 'bg-[linear-gradient(90deg,rgba(222,247,198,0.9),rgba(241,252,219,0.9))] text-[var(--text-primary)] shadow-[0_10px_22px_rgba(157,201,108,0.18)]'
          : 'text-[var(--text-secondary)] hover:bg-white/70 hover:text-[var(--text-primary)] hover:shadow-[0_10px_22px_rgba(45,78,135,0.06)]',
        collapsed ? 'justify-center px-2' : 'px-3'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-[14px] flex-shrink-0"
        style={{
          background: isActive ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.4)',
          boxShadow: isActive ? '0 8px 18px rgba(138, 181, 83, 0.16)' : 'none',
        }}
      >
        <Icon
          size={16}
          style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-dim)' }}
          className="transition-colors"
        />
      </div>

      {!collapsed && (
        <span
          className="text-[13px] font-medium transition-colors"
          style={isActive ? { color: 'var(--text-primary)' } : {}}
        >
          {item.label}
        </span>
      )}
    </Link>
  )
}

export function Sidebar({ collapsed = false, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const currentUser = useAgentsStore((state) => state.currentUser)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    let active = true

    const loadRole = async () => {
      if (currentUser?.role) {
        if (active) setIsSuperAdmin(currentUser.role === 'super_admin')
        return
      }

      const token = await getSupabaseAccessToken()
      if (!token) {
        if (active) setIsSuperAdmin(false)
        return
      }

      const response = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!active) return

      if (!response.ok) {
        setIsSuperAdmin(false)
        return
      }

      const payload = await response.json()
      setIsSuperAdmin(payload?.user?.role === 'super_admin')
    }

    loadRole()

    return () => {
      active = false
    }
  }, [currentUser?.role])

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => isSuperAdmin || !ADMIN_ONLY_IDS.has(item.id)),
    [isSuperAdmin]
  )
  const primaryNavItems = useMemo(
    () => visibleNavItems.filter((item) => !['settings'].includes(item.id)),
    [visibleNavItems]
  )
  const settingsNavItems = useMemo(
    () => visibleNavItems.filter((item) => ['settings'].includes(item.id)),
    [visibleNavItems]
  )

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <nav
        className={clsx(
          'fixed left-0 top-0 h-full z-50 flex flex-col glass mission-shell border-r border-[var(--border)] md:hidden',
          'w-64 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-end h-16 px-4 border-b border-[var(--border)] flex-shrink-0">
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1">
            {primaryNavItems.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                onClick={onMobileClose}
              />
            ))}
          </div>

          {settingsNavItems.length ? (
            <div className="mt-8">
              <p className="px-3 pb-3 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)]">Settings</p>
              <div className="space-y-1">
                {settingsNavItems.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                    onClick={onMobileClose}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3 rounded-[20px] border border-white/50 bg-white/72 p-3 shadow-[0_12px_24px_rgba(45,78,135,0.08)]">
            <div className="h-9 w-9 rounded-[14px] bg-[linear-gradient(180deg,#ffffff,#f4f7fb)] border border-white/80 shadow-[0_10px_18px_rgba(45,78,135,0.08)]" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--text-primary)]">Agency Mode</p>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--text-dim)]">Iris · Online</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#2dd4bf] shadow-[0_0_4px_#2dd4bf] flex-shrink-0 animate-pulse" />
          </div>
        </div>
      </nav>

      {/* Desktop sidebar */}
      <nav
        className={clsx(
          'hidden md:flex flex-col glass mission-shell border-r border-[var(--border)]',
          'flex-shrink-0 transition-all duration-200',
          collapsed ? 'w-16' : 'w-56'
        )}
        aria-label="Main navigation"
      >
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1">
            {primaryNavItems.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                collapsed={collapsed}
              />
            ))}
          </div>

          {settingsNavItems.length ? (
            <div className="mt-8">
              {!collapsed && (
                <p className="px-3 pb-3 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)]">Settings</p>
              )}
              <div className="space-y-1">
                {settingsNavItems.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className={clsx(
          'border-t border-[var(--border)] flex-shrink-0',
          collapsed ? 'p-2' : 'p-3'
        )}>
          <div className={clsx(
            'flex items-center gap-2.5 rounded-[20px] border border-white/50 bg-white/72 p-3 shadow-[0_12px_24px_rgba(45,78,135,0.08)]',
            collapsed ? 'justify-center' : ''
          )}>
            <div className="h-9 w-9 rounded-[14px] bg-[linear-gradient(180deg,#ffffff,#f4f7fb)] border border-white/80 shadow-[0_10px_18px_rgba(45,78,135,0.08)]" />
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">Agency Mode</p>
                  <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--text-dim)]">Iris · Online</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#2dd4bf] shadow-[0_0_4px_#2dd4bf] flex-shrink-0 animate-pulse" />
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
