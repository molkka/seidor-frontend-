import { useT } from '@/hooks/useT'
import { ContentSection } from '../components/content-section'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

const STACK = [
  { label: 'backend', value: 'FastAPI · Python 3.11' },
  { label: 'frontend', value: 'React 19 · TypeScript · Vite' },
  { label: 'db', value: 'PostgreSQL · SQLAlchemy' },
  { label: 'auth', value: 'JWT HS256 · Google OAuth2' },
] as const

export function SettingsAbout() {
  const t = useT().settings.about
  const labels: Record<string, string> = {
    backend: t.backendLabel,
    frontend: t.frontendLabel,
    db: t.dbLabel,
    auth: t.authLabel,
  }

  return (
    <ContentSection title={t.title} desc={t.subtitle}>
      <div className='space-y-6'>
        <div className='space-y-1'>
          <p className='text-xs uppercase tracking-wider text-muted-foreground'>
            {t.version}
          </p>
          <p className='text-sm font-medium'>1.0.0 — SAP Africa Planning</p>
          <Badge variant='secondary'>SEIDOR Africa</Badge>
        </div>

        <Separator />

        <div className='space-y-2'>
          <p className='text-xs uppercase tracking-wider text-muted-foreground'>
            {t.stack}
          </p>
          <div className='grid gap-2'>
            {STACK.map(({ label, value }) => (
              <div key={label} className='flex items-center gap-2 text-sm'>
                <span className='w-24 shrink-0 font-medium text-muted-foreground'>
                  {labels[label]}
                </span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ContentSection>
  )
}
