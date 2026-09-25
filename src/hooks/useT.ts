import { fr } from '@/i18n/fr'
import { en } from '@/i18n/en'
import { useI18nStore } from '@/store/i18nStore'

const TRANSLATIONS = { fr, en }

export function useT() {
  const lang = useI18nStore((s) => s.lang)
  return TRANSLATIONS[lang] ?? fr
}
