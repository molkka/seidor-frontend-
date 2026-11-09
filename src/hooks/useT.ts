import { fr } from '@/i18n/fr'
import { en } from '@/i18n/en'
import { ar } from '@/i18n/ar'
import { useI18nStore } from '@/store/i18nStore'

const TRANSLATIONS = { fr, en, ar }

export function useT() {
  const lang = useI18nStore((s) => s.lang)
  return TRANSLATIONS[lang] ?? fr
}
