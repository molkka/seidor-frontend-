import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface PlatformStats {
  total_consultants: number
  total_projets: number
  consultants_actifs: number
  projets_in_progress: number
  version_actuelle: string
}

type BrandPanelProps = {
  stats: PlatformStats | null
  className?: string
}

// Desktop-only promotional panel. Its padding (p-3 inset + p-7/p-9) puts the
// badge and the stats on the same top and bottom lines as the form column's
// logo and footer (40px, 48px from xl).
export function BrandPanel({ stats, className }: BrandPanelProps) {
  const figures = stats && [
    { label: 'Consultants', value: `+${stats.total_consultants}` },
    { label: 'Projects', value: `+${stats.total_projets}` },
    { label: 'In progress', value: `+${stats.projets_in_progress}` },
    { label: 'Active version', value: stats.version_actuelle ?? 'V1.3' },
  ]

  return (
    <aside
      className={cn(
        'hidden lg:sticky lg:top-0 lg:block lg:h-svh lg:p-3',
        className
      )}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className='relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-brand-navy p-7 text-white xl:p-9'
      >
        <img
          src='/images/auth-landscape.jpg'
          alt=''
          className='absolute inset-0 size-full object-cover'
        />
        {/* Brand-navy scrim: light over the sky, dense behind the copy */}
        <div
          aria-hidden
          className='absolute inset-0 bg-linear-to-t from-brand-navy via-brand-navy/55 via-35% to-brand-navy/5'
        />

        <div className='relative flex h-10 items-center'>
          <span className='inline-flex h-8 items-center gap-2 rounded-full border border-white/20 bg-brand-navy/40 px-3.5 text-xs font-semibold tracking-widest text-white uppercase backdrop-blur-md'>
            <span aria-hidden className='size-1.5 rounded-full bg-brand-cyan' />
            SAP Africa Region
          </span>
        </div>

        <div className='relative'>
          <h2 className='text-4xl leading-tight font-semibold tracking-tight xl:text-5xl'>
            Plan smarter.
            <br />
            Deliver faster.
          </h2>
          <p className='mt-4 max-w-md text-base leading-relaxed text-balance text-white/80 xl:text-lg'>
            Resource planning and delivery insights for your SAP Africa team.
          </p>

          {figures && (
            <dl className='mt-8 grid grid-cols-4 gap-x-4 border-t border-white/15 pt-6 xl:mt-10 xl:gap-x-6'>
              {figures.map((f) => (
                // dt must precede dd; reverse visually, values top-aligned
                <div
                  key={f.label}
                  className='flex flex-col-reverse justify-end gap-1'
                >
                  <dt className='text-xs font-medium tracking-wider text-white/60 uppercase'>
                    {f.label}
                  </dt>
                  <dd className='text-2xl font-semibold tracking-tight'>
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </motion.div>
    </aside>
  )
}
