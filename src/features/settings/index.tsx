import { Outlet } from '@tanstack/react-router'
import {
  Bell,
  Globe,
  Info,
  Palette,
  Shield,
  UserCog,
  Users,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/hooks/useT'
import { SidebarNav } from './components/sidebar-nav'

export function Settings() {
  const t = useT().settings
  const role = useAuthStore((s) => s.user?.role)

  const sidebarNavItems = [
    {
      title: t.profile.nav,
      href: '/settings',
      icon: <UserCog size={18} />,
    },
    ...(role === 'ADMIN'
      ? [
          {
            title: t.users.nav,
            href: '/settings/users',
            icon: <Users size={18} />,
          },
        ]
      : []),
    {
      title: t.security.nav,
      href: '/settings/account',
      icon: <Shield size={18} />,
    },
    {
      title: t.appearance.nav,
      href: '/settings/appearance',
      icon: <Palette size={18} />,
    },
    {
      title: t.language.nav,
      href: '/settings/language',
      icon: <Globe size={18} />,
    },
    {
      title: t.notifications.nav,
      href: '/settings/notifications',
      icon: <Bell size={18} />,
    },
    {
      title: t.about.nav,
      href: '/settings/about',
      icon: <Info size={18} />,
    },
  ]

  return (
    <div className='space-y-6'>
      <div className='space-y-0.5'>
        <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
          Paramètres
        </h1>
        <p className='text-muted-foreground'>
          Gérez les paramètres de votre compte.
        </p>
      </div>
      <Separator />
      <div className='flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-12'>
        <aside className='lg:w-1/5'>
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <div className='flex min-h-0 flex-1 flex-col'>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
