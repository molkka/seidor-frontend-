import { Bell } from 'lucide-react'
import { useT } from '@/hooks/useT'

export function NotificationsForm() {
  const t = useT().settings.notifications
  return (
    <div className='flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground'>
      <Bell size={36} strokeWidth={1.5} />
      <p className='text-sm'>{t.coming}</p>
    </div>
  )
}
