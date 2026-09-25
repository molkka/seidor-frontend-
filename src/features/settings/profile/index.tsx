import { useT } from '@/hooks/useT'
import { ContentSection } from '../components/content-section'
import { ProfileForm } from './profile-form'

export function SettingsProfile() {
  const t = useT().settings.profile
  return (
    <ContentSection title={t.title} desc={t.subtitle}>
      <ProfileForm />
    </ContentSection>
  )
}
