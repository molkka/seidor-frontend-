import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { MotionConfig, motion } from 'framer-motion'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Shell for the secondary auth pages (forgot / reset password). Same logo,
// palette, controls and footer as the sign-in page; a single centred card
// instead of the split screen. `light` pins the light palette (see theme.css).
export function AuthCardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion='user'>
      <div className='light flex min-h-svh flex-col bg-background text-foreground scheme-light'>
        <main className='flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6'>
          <Link
            to='/'
            aria-label='SEIDOR — go to sign in'
            className='rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
          >
            <img
              src='/images/seidor-logo.png'
              alt='SEIDOR'
              className='h-10 w-auto'
            />
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className='mt-8 w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8'
          >
            {children}
          </motion.div>
        </main>

        <footer className='px-4 pb-8 text-center text-xs text-muted-foreground'>
          © {new Date().getFullYear()} SEIDOR · Humanizing Technology
        </footer>
      </div>
    </MotionConfig>
  )
}

const iconTones = {
  brand: 'bg-secondary text-primary',
  success: 'bg-emerald-50 text-emerald-600',
  error: 'bg-destructive/10 text-destructive',
}

type AuthCardHeaderProps = {
  icon: LucideIcon
  tone?: keyof typeof iconTones
  /** Spin the icon (loading states). */
  spin?: boolean
  title: string
  /** Move focus to the title so screen readers announce a state change. */
  autoFocus?: boolean
  children?: React.ReactNode
}

export function AuthCardHeader({
  icon: Icon,
  tone = 'brand',
  spin,
  title,
  autoFocus,
  children,
}: AuthCardHeaderProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus()
  }, [autoFocus])

  return (
    <div>
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-xl',
          iconTones[tone]
        )}
      >
        <Icon className={cn('size-5', spin && 'animate-spin')} aria-hidden />
      </span>
      <h1
        ref={titleRef}
        tabIndex={-1}
        className='mt-6 text-2xl font-semibold tracking-tight outline-none'
      >
        {title}
      </h1>
      {children && (
        <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>
          {children}
        </p>
      )}
    </div>
  )
}

export function AuthBackToSignIn() {
  return (
    <div className='mt-8 flex justify-center border-t border-border pt-6'>
      <Link
        to='/'
        className='inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40'
      >
        <ArrowLeft className='size-4' aria-hidden />
        Back to sign in
      </Link>
    </div>
  )
}
