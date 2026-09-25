import { toast } from 'sonner'
import { useI18nStore } from '@/store/i18nStore'
import { useT } from '@/hooks/useT'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LANGS = [
  { value: 'fr', flag: '🇫🇷' },
  { value: 'en', flag: '🇬🇧' },
] as const

export function LanguageForm() {
  const t = useT().settings.language
  const { lang, setLang } = useI18nStore()

  function handleSelect(value: 'fr' | 'en') {
    setLang(value)
    toast.success(t.saved)
  }

  return (
    <div className='flex gap-3'>
      {LANGS.map(({ value, flag }) => (
        <Button
          key={value}
          variant='outline'
          onClick={() => handleSelect(value)}
          className={cn(
            'h-auto flex-col gap-1 px-6 py-4',
            lang === value && 'border-primary bg-primary/5 ring-1 ring-primary'
          )}
        >
          <span className='text-2xl'>{flag}</span>
          <span className='text-sm font-medium'>
            {t[value as 'fr' | 'en']}
          </span>
        </Button>
      ))}
    </div>
  )
}
