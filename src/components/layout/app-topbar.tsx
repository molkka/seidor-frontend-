import { useState } from 'react'
import { toast } from 'sonner'
import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/store/authStore'
import { usePlanningYearStore } from '@/store/planningYearStore'
import { useT } from '@/hooks/useT'
import {
  LayoutDashboard, CalendarDays, Users, FolderKanban,
  Calendar, ChevronDown, LogOut, Settings, Building2,
} from 'lucide-react'

// ── SEIDOR design tokens ──────────────────────────────────────────────────────
const S = {
  navy:      '#162B6E',
  blue:      '#1E3A8A',
  dark:      '#0A0F1C',
  gray:      '#5A6472',
  border:    '#E0E4E8',
  bgLight:   '#F5F6F8',
  navyLight: '#EEF3FB',
  white:     '#FFFFFF',
} as const

const NAV_URLS = [
  { key: 'dashboard'   as const, url: '/dashboard',   icon: LayoutDashboard },
  { key: 'planning'    as const, url: '/planning',    icon: CalendarDays },
  { key: 'consultants' as const, url: '/consultants', icon: Users },
  { key: 'projets'     as const, url: '/projets',     icon: FolderKanban },
  { key: 'calendar'    as const, url: '/imputation',  icon: Calendar },
]

// ── Sub-components defined at file top level ──────────────────────────────────

function NavLink({ item, active }: { item: { title: string; url: string; icon: React.ElementType }; active: boolean }) {
  const [hovered, setHovered] = useState(false)
  const color = active ? S.navy : hovered ? S.blue : S.gray

  return (
    <Link
      to={item.url}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: '100%',
        padding: '0 13px',
        fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        color,
        textDecoration: 'none',
        letterSpacing: '.01em',
        whiteSpace: 'nowrap',
        borderBottom: `2px solid ${active ? S.navy : hovered ? S.blue : 'transparent'}`,
        transition: 'color .18s, border-color .18s',
        boxSizing: 'border-box',
      }}
    >
      <item.icon size={14} strokeWidth={active ? 2.2 : 1.8} />
      {item.title}
    </Link>
  )
}

function MenuAction({
  icon: Icon, label, sub, href, destructive, disabled, onClose, onClick,
}: {
  icon: React.ElementType
  label: string
  sub?: string
  href?: string
  destructive?: boolean
  disabled?: boolean
  onClose?: () => void
  onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const bg = hovered ? (destructive ? '#fef2f2' : S.bgLight) : 'transparent'

  const inner = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 10px', borderRadius: 8,
      background: bg, transition: 'background .15s',
      opacity: disabled ? 0.4 : 1,
      cursor: disabled ? 'default' : 'pointer',
    }}>
      <Icon size={14} style={{ color: destructive ? '#dc2626' : S.gray, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: destructive ? '#dc2626' : S.dark }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: S.gray, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )

  const events = {
    onMouseEnter: () => !disabled && setHovered(true),
    onMouseLeave: () => setHovered(false),
  }

  if (href) {
    return (
      <Link to={href} style={{ textDecoration: 'none' }} onClick={onClose} {...events}>
        {inner}
      </Link>
    )
  }
  return (
    <div onClick={!disabled ? onClick : undefined} {...events}>
      {inner}
    </div>
  )
}

function UserDropdown({ user, onLogout }: {
  user: { nom?: string; email?: string; role?: string } | null
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const t = useT().userMenu
  const initials = user?.nom?.[0]?.toUpperCase() ?? 'U'

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 38, padding: '0 12px 0 6px',
          borderRadius: 100,
          background: open ? S.navyLight : 'transparent',
          border: `1.5px solid ${open ? S.navy : S.border}`,
          cursor: 'pointer', transition: 'all .18s',
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${S.navy}, ${S.blue})`,
          color: S.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
        }}>
          {initials}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 500, color: S.dark,
          maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {user?.nom ?? 'User'}
        </span>
        <ChevronDown size={12} style={{
          color: S.gray, flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform .18s',
        }} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 10px)', zIndex: 50,
            background: S.white,
            border: `1px solid ${S.border}`,
            borderRadius: 16,
            boxShadow: '0 16px 48px rgba(0,51,160,.13), 0 4px 16px rgba(0,0,0,.05)',
            minWidth: 228, overflow: 'hidden',
          }}>
            {/* Profile header */}
            <div style={{
              padding: '16px 18px',
              background: `linear-gradient(135deg, ${S.navy}08, ${S.blue}0d)`,
              borderBottom: `1px solid ${S.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${S.navy}, ${S.blue})`,
                  color: S.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: S.dark, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {user?.nom}
                  </div>
                  <div style={{ fontSize: 11, color: S.gray, marginTop: 2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {user?.email}
                  </div>
                </div>
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10,
                padding: '3px 10px', borderRadius: 100,
                background: S.navyLight, border: `1px solid ${S.navy}28`,
                fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
                color: S.navy,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: S.navy }} />
                {user?.role ?? 'CONSULTANT'}
              </div>
            </div>

            {/* Menu actions */}
            <div style={{ padding: 6 }}>
              <MenuAction
                icon={Building2}
                label={t.workspace}
                sub={t.workspaceSub}
                disabled
              />
              <MenuAction
                icon={Settings}
                label={t.settings}
                href="/settings"
                onClose={() => setOpen(false)}
              />
              <div style={{ height: 1, background: S.border, margin: '4px 6px' }} />
              <MenuAction
                icon={LogOut}
                label={t.logout}
                destructive
                onClick={() => { setOpen(false); onLogout() }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main exported component ────────────────────────────────────────────────────
export function AppTopbar() {
  const { user, logout } = useAuthStore()
  const { selectedYear } = usePlanningYearStore()
  const { location } = useRouterState()
  const navigate = useNavigate()
  const t = useT()
  const pathname = location.pathname

  const navItems = NAV_URLS.map(item => ({ ...item, title: t.nav[item.key] }))

  async function handleLogout() {
    const revoked = await logout()
    if (!revoked) toast.error(t.security.logoutUnavailable)
    navigate({ to: '/' })
  }

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 64,
      background: S.white,
      borderBottom: `1px solid ${S.border}`,
      display: 'flex', alignItems: 'stretch',
      padding: '0 2rem',
      boxShadow: '0 2px 12px rgba(0,51,160,.07)',
    }}>

      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', flexShrink: 0,
        paddingRight: '1.5rem', marginRight: '0.5rem',
        borderRight: `1.5px solid ${S.border}`,
      }}>
        <img
          src="/images/seidorCapture.PNG"
          alt="SEIDOR"
          style={{ height: 30, width: 'auto', objectFit: 'contain' }}
        />
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', alignItems: 'stretch', flex: 1, overflow: 'hidden' }}>
        {navItems.map(item => {
          const active = pathname === item.url || pathname.startsWith(item.url + '/')
          return <NavLink key={item.url} item={item} active={active} />
        })}
      </nav>

      {/* Right: year badge + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, paddingLeft: '1rem' }}>
        {selectedYear && (
          <button
            onClick={() => navigate({ to: '/year-selection' })}
            title={t.userMenu.changeYear}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 100,
              background: S.navyLight,
              border: `1.5px solid ${S.navy}30`,
              fontSize: 12, fontWeight: 700, letterSpacing: '.04em',
              color: S.navy, cursor: 'pointer',
              transition: 'all .18s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = S.navy
              ;(e.currentTarget as HTMLElement).style.color = '#fff'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = S.navyLight
              ;(e.currentTarget as HTMLElement).style.color = S.navy
            }}
          >
            <CalendarDays size={12} />
            {selectedYear}
          </button>
        )}
        <UserDropdown user={user} onLogout={handleLogout} />
      </div>
    </header>
  )
}
