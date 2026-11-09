import { useLayoutEffect, useRef, useState } from 'react'
import { GoogleLogin, type GoogleLoginProps } from '@react-oauth/google'
import { motion } from 'framer-motion'
import {
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

// Every control on the auth form is 40px tall (h-10): Google's "large"
// button is fixed at that height and can't be restyled, so the rest of the
// form is sized to match it.

export const authLinkClass =
  'rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring/40'

type AuthFieldProps = {
  id: string
  label: string
  /** Rendered at the end of the label row (e.g. "Forgot password?"). */
  action?: React.ReactNode
  children: React.ReactNode
}

export function AuthField({ id, label, action, children }: AuthFieldProps) {
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between gap-4'>
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children}
    </div>
  )
}

type AuthInputProps = React.ComponentProps<typeof Input> & {
  /** Decorative icon shown at the start of the field. */
  icon?: LucideIcon
}

export function AuthInput({ className, icon: Icon, ...props }: AuthInputProps) {
  const input = (
    <Input
      className={cn(
        'h-10 bg-white px-3.5 text-sm focus-visible:ring-ring/20',
        Icon && 'ps-10',
        className
      )}
      {...props}
    />
  )
  if (!Icon) return input

  return (
    <div className='relative'>
      <Icon
        aria-hidden
        className='pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
      />
      {input}
    </div>
  )
}

export function AuthPasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye

  return (
    <div className='relative'>
      <AuthInput
        type={visible ? 'text' : 'password'}
        className={cn('pe-11', className)}
        {...props}
      />
      <button
        type='button'
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className='absolute end-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40'
      >
        <Icon className='size-4' aria-hidden />
      </button>
    </div>
  )
}

type AuthMessageProps = {
  tone: 'error' | 'success'
  children: React.ReactNode
}

export function AuthMessage({ tone, children }: AuthMessageProps) {
  const isError = tone === 'error'
  const Icon = isError ? CircleAlert : CircleCheck

  return (
    <Alert
      variant={isError ? 'destructive' : 'default'}
      role={isError ? 'alert' : 'status'}
      className={cn(
        'rounded-md px-3.5',
        isError
          ? 'border-destructive/25 bg-destructive/5'
          : 'border-emerald-600/25 bg-emerald-50 text-emerald-800'
      )}
    >
      <Icon aria-hidden />
      <p className='col-start-2'>{children}</p>
    </Alert>
  )
}

/** Height-animates optional fields in and out without clipping focus rings. */
export function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
      animate={{
        height: 'auto',
        opacity: 1,
        transitionEnd: { overflow: 'visible' },
      }}
      exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function AuthDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex items-center gap-3 text-xs text-muted-foreground'>
      <Separator className='flex-1' />
      {children}
      <Separator className='flex-1' />
    </div>
  )
}

type GoogleSignInButtonProps = Pick<GoogleLoginProps, 'onSuccess' | 'onError'>

// Google renders its button inside an iframe, so it can only be sized, not
// styled. Track the column width so it always lines up with the inputs.
export function GoogleSignInButton({
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Google accepts widths between 200 and 400px
    const measure = () =>
      setWidth(Math.min(400, Math.max(200, Math.floor(el.clientWidth))))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className='flex h-10 w-full justify-center'>
      {width > 0 && (
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          theme='outline'
          size='large'
          shape='rectangular'
          text='continue_with'
          logo_alignment='center'
          width={width}
        />
      )}
    </div>
  )
}
