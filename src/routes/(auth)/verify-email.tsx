import { createFileRoute } from '@tanstack/react-router'
import { EmailVerification } from '@/features/auth/consultant-registration'

export const Route = createFileRoute('/(auth)/verify-email')({ component: EmailVerification })
