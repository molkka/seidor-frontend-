import { createFileRoute } from '@tanstack/react-router'
import PlanningPage from '@/pages/planning/PlanningPage'

export const Route = createFileRoute('/_authenticated/planning/')({
  component: PlanningPage,
})
