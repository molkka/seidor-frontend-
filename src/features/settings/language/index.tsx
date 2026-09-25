import { useT } from '@/hooks/useT'
import { ContentSection } from '../components/content-section'
import { LanguageForm } from './language-form'

export function SettingsLanguage() {
  const t = useT().settings.language
  return (
    <ContentSection title={t.title} desc={t.subtitle}>
      <LanguageForm />
    </ContentSection>
  )
}
