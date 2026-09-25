import { createFileRoute } from '@tanstack/react-router'
import ImputationPage from '@/pages/imputation/ImputationPage'

export const Route = createFileRoute('/_authenticated/imputation/')({
  component: ImputationPage,
})
