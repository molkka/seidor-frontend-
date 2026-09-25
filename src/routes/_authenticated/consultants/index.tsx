import { createFileRoute } from '@tanstack/react-router'
import ConsultantsPage from '@/pages/consultants/ConsultantsPage'

export const Route = createFileRoute('/_authenticated/consultants/')({
  component: ConsultantsPage,
})
