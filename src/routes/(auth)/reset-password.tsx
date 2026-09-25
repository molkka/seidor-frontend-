import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ResetPassword } from '@/features/auth/reset-password'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/reset-password')({
  component: RouteComponent,
  validateSearch: searchSchema,
})

function RouteComponent() {
  const { token } = Route.useSearch()
  return <ResetPassword token={token} />
}
