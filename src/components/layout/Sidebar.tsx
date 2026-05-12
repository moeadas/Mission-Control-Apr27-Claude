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
  Rocket,
  Calendar,
  HelpCircle,
  ShieldCheck,
  Megaphone,
  Database,
} from 'lucide-react'
import { clsx } from 'clsx'
import { getAuthToken } from '@/lib/auth/browser'
import { useAgentsStore } from '@/lib/agents-store'

// ─── Navigation structure ────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { id: 'mission', label: 'Start a Mission', icon: Rocket, href: '/mission', color: '#9b6dff', highlight: true },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', color: '#60a5fa' },
  { id: 'office', label: 'Virtual Office', icon: Building2, href: '/office', color: '#2dd4bf' },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, href: '/tasks', color: '#fb923c' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/analytics', color: '#a78bfa' },
  { id: 'ads', label: 'Meta Ads', icon: Megaphone, href: '/ads', color: '#3b82f6' },
  { id: 'outputs', label: 'Output', icon: FileText, href: '/outputs', color: '#60a5fa' },
]

const COMPANY_SETUP_NAV = [
  { id: 'agents', label: 'Agents', icon: Bot, href: '/agents', color: '#a78bfa' },
  { id: 'clients', label: 'Clients', icon: Users, href: '/clients', color: '#fbbf24' },
  { id: 'skills', label: 'Skills', icon: BookOpen, href: '/skills', color: '#fbbf24' },
  { id: 'pipeline', label: 'Pipelines', icon: GitBranch, href: '/pipeline', color: '#2dd4bf' },
  { id: 'schedules', label: 'Schedules', icon: Calendar, href: '/schedules', color: '#22d3ee' },
  { id: 'team', label: 'Team', icon: Users, href: '/team', color: '#34d399' },
  { id: 'users', label: 'Users', icon: Shield, href: '/users', color: '#f472b6' },
]

const SETTINGS_NAV = [
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings', color: '#71717a' },
  { id: 'support', label: 'Support', icon: HelpCircle, href: '/support', color: '#71717a' },
]

const SUPER_ADMIN_NAV = [
  { id: 'admin-tenants', label: 'Tenants', icon: ShieldCheck, href: '/admin/tenants', color: '#a78bfa' },
  { id: 'admin-plans', label: 'Pricing', icon: Shield, href: '/admin/plans', color: '#fbbf24' },
  { id: 'admin-backups', label: 'Backups', icon: Database, href: '/admin/backups', color: '#3b82f6' },
]

// IDs visible only to super_admin
const SUPER_ADMIN_ONLY_IDS = new Set(['users'])
// IDs visible to admin + super_admin (not plain members)
const ADMIN_OR_ABOVE_IDS = new Set(['pipeline', 'skills', 'settings', 'schedules', 'team'])

interface SidebarProps {
  collapsed?: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
}

type NavItem = {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  href: string
  color: string
  highlight?: boolean
}

function NavItem({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  collapsed?: boolean
  onClick?: () => void
}) {
  const Icon = item.icon

  if (item.highlight && !collapsed) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={clsx(
          'group relative flex items-center gap-3 rounded-[18px] transition-all duration-150 min-h-[46px] px-3',
          isActive
            ? 'shadow-[0_10px_22px_rgba(155,109,255,0.35)]'
            : 'hover:shadow-[0_10px_22px_rgba(155,109,255,0.22)] hover:scale-[1.01]'
        )}
        style={{
          background: isActive
            ? 'linear-gradient(135deg, #9b6dff, #6f42f5)'
            : 'linear-gradient(135deg, rgba(155,109,255,0.16), rgba(111,66,245,0.10))',
          border: `1px solid ${isActive ? 'rgba(155,109,255,0.5)' : 'rgba(155,109,255,0.28)'}`,
        }}
        aria-current={isActive ? 'page' : undefined}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-[14px] flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <Icon size={16} style={{ color: isActive ? '#fff' : '#c4a8ff' }} />
        </div>
        <span className="text-[13px] font-semibold flex-1 leading-tight" style={{ color: isActive ? '#fff' : '#c4a8ff' }}>
          {item.label}
        </span>
      </Link>
    )
  }

  // Collapsed highlight item
  if (item.highlight && collapsed) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className="flex items-center justify-center w-10 h-10 rounded-[14px] mx-auto transition-all"
        style={{
          background: isActive ? 'linear-gradient(135deg, #9b6dff, #6f42f5)' : 'rgba(155,109,255,0.15)',
          border: '1px solid rgba(155,109,255,0.3)',
        }}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon size={16} style={{ color: isActive ? '#fff' : '#c4a8ff' }} />
      </Link>
    )
  }

  return (
    <Link
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

function SectionLabel({ label, collapsed }: { label: string; collapsed?: boolean }) {
  if (collapsed) {
    return <div className="my-3 mx-auto w-8 h-px bg-[var(--border)]" />
  }
  return (
    <div className="mt-5 mb-2 px-1 flex items-center gap-2">
      <div className="h-px flex-1 bg-[var(--border)]" />
      <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--text-dim)] whitespace-nowrap px-1">
        {label}
      </p>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  )
}

export function Sidebar({ collapsed = false, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const currentUser = useAgentsStore((state) => state.currentUser)
  const [role, setRole] = useState<'super_admin' | 'admin' | 'member'>('member')

  const isSuperAdmin = role === 'super_admin'
  const isAdminOrAbove = role === 'super_admin' || role === 'admin'

  useEffect(() => {
    let active = true

    const loadRole = async () => {
      if (currentUser?.role) {
        if (active) setRole(currentUser.role as 'super_admin' | 'admin' | 'member')
        return
      }

      const token = await getAuthToken()
      if (!token) {
        if (active) setRole('member')
        return
      }

      const response = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!active) return
      if (!response.ok) {
        setRole('member')
        return
      }

      const payload = await response.json()
      const r = payload?.user?.role
      if (active) setRole(r === 'super_admin' ? 'super_admin' : r === 'admin' ? 'admin' : 'member')
    }

    loadRole()
    return () => { active = false }
  }, [currentUser?.role])

  const visibleCompanySetup = useMemo(
    () => COMPANY_SETUP_NAV.filter((item) => {
      if (SUPER_ADMIN_ONLY_IDS.has(item.id)) return isSuperAdmin
      if (ADMIN_OR_ABOVE_IDS.has(item.id)) return isAdminOrAbove
      return true
    }),
    [isSuperAdmin, isAdminOrAbove]
  )
  const visibleSettings = useMemo(
    () => SETTINGS_NAV.filter((item) => {
      if (SUPER_ADMIN_ONLY_IDS.has(item.id)) return isSuperAdmin
      if (ADMIN_OR_ABOVE_IDS.has(item.id)) return isAdminOrAbove
      return true
    }),
    [isSuperAdmin, isAdminOrAbove]
  )

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const renderNav = (isMobile?: boolean) => {
    const c = !isMobile && collapsed
    return (
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {/* Primary nav */}
        <div className="space-y-1">
          {PRIMARY_NAV.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={isActive(item.href)}
              collapsed={c}
              onClick={isMobile ? onMobileClose : undefined}
            />
          ))}
        </div>

        {/* Company Setup */}
        {visibleCompanySetup.length > 0 && (
          <>
            <SectionLabel label="Company Setup" collapsed={c} />
            <div className="space-y-1">
              {visibleCompanySetup.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  isActive={isActive(item.href)}
                  collapsed={c}
                  onClick={isMobile ? onMobileClose : undefined}
                />
              ))}
            </div>
          </>
        )}

        {/* Settings */}
        {visibleSettings.length > 0 && (
          <>
            <SectionLabel label="Settings" collapsed={c} />
            <div className="space-y-1">
              {visibleSettings.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  isActive={isActive(item.href)}
                  collapsed={c}
                  onClick={isMobile ? onMobileClose : undefined}
                />
              ))}
            </div>
          </>
        )}

        {/* Super Admin */}
        {isSuperAdmin && (
          <>
            <SectionLabel label="Super Admin" collapsed={c} />
            <div className="space-y-1">
              {SUPER_ADMIN_NAV.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  isActive={isActive(item.href)}
                  collapsed={c}
                  onClick={isMobile ? onMobileClose : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  const renderFooter = (isCollapsed?: boolean) => (
    <div className={clsx('border-t border-[var(--border)] flex-shrink-0', isCollapsed ? 'p-2' : 'p-3')}>
      <div className={clsx(
        'flex items-center gap-2.5 rounded-[20px] border border-white/50 bg-white/72 p-3 shadow-[0_12px_24px_rgba(45,78,135,0.08)]',
        isCollapsed ? 'justify-center' : ''
      )}>
        <div className="h-9 w-9 rounded-[14px] bg-[linear-gradient(180deg,#ffffff,#f4f7fb)] border border-white/80 shadow-[0_10px_18px_rgba(45,78,135,0.08)] flex-shrink-0" />
        {!isCollapsed && (
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
        {renderNav(true)}
        {renderFooter(false)}
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
        {renderNav(false)}
        {renderFooter(collapsed)}
      </nav>
    </>
  )
}
