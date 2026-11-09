import {
  LayoutDashboard,
  BarChart3,
  Bell,
  Globe,
  Info,
  Palette,
  Settings,
  Shield,
  UserCog,
  Users,
  CalendarDays,
  FolderKanban,
  Timer,
  HelpCircle,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'SEIDOR User',
    email: 'user@seidor.com',
    avatar: '/images/seidorCapture.PNG',
  },
  teams: [],
  navGroups: [
    {
      title: 'Planning SAP Africa',
      items: [
        {
          title: 'Dashboard',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          title: 'Analytics',
          url: '/analytics',
          icon: BarChart3,
        },
        {
          title: 'Planification',
          url: '/planning',
          icon: CalendarDays,
        },
        {
          title: 'Consultants',
          url: '/consultants',
          icon: Users,
        },
        {
          title: 'Projets',
          url: '/projets',
          icon: FolderKanban,
        },
        {
          title: 'Calendrier',
          url: '/imputation',
          icon: Timer,
        },
      ],
    },
    {
      title: 'Paramètres',
      items: [
        {
          title: 'Paramètres',
          icon: Settings,
          items: [
            {
              title: 'Profil',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Utilisateurs',
              url: '/settings/users',
              icon: Users,
            },
            {
              title: 'Sécurité',
              url: '/settings/account',
              icon: Shield,
            },
            {
              title: 'Apparence',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: 'Langue',
              url: '/settings/language',
              icon: Globe,
            },
            {
              title: 'Notifications',
              url: '/settings/notifications',
              icon: Bell,
            },
            {
              title: 'À propos',
              url: '/settings/about',
              icon: Info,
            },
          ],
        },
        {
          title: 'Centre d\'aide',
          url: '/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ],
}
