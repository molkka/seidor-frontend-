import { createFileRoute } from '@tanstack/react-router'
import ConsultantDetailPage from '@/pages/consultants/ConsultantDetailPage'

export const Route = createFileRoute('/_authenticated/consultants/$consultantId')({
  component: ConsultantDetailPage,
})
