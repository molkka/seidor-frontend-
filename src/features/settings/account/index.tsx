import { useT } from '@/hooks/useT'
import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  const t = useT().settings.security
  return (
    <ContentSection title={t.title} desc={t.subtitle}>
      <AccountForm />
    </ContentSection>
  )
}
