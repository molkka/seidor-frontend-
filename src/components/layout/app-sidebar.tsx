import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

// ── SEIDOR brand logo ──────────────────────────────────────
function SeidorBrand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size='lg' className='pointer-events-none select-none'>
          {/* Real SEIDOR logo */}
          <img
            src='/images/seidorCapture.PNG'
            alt='SEIDOR'
            className='h-8 w-auto object-contain shrink-0'
          />
          {/* Subtitle — hidden when sidebar is collapsed */}
          <div className='grid flex-1 text-start text-sm leading-tight'>
            <span className='truncate text-xs text-muted-foreground font-medium'>
              Planning SAP Africa
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// ── Sidebar ────────────────────────────────────────────────
export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <SeidorBrand />
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
