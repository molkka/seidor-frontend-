import { useT } from '@/hooks/useT'
import { ContentSection } from '../components/content-section'
import { NotificationsForm } from './notifications-form'

export function SettingsNotifications() {
  const t = useT().settings.notifications
  return (
    <ContentSection title={t.title} desc={t.subtitle}>
      <NotificationsForm />
    </ContentSection>
  )
}
