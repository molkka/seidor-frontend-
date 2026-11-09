import { createFileRoute } from '@tanstack/react-router'
import PlanningPage from '@/pages/planning/PlanningPage'

export const Route = createFileRoute('/_authenticated/planning/')({
  validateSearch: (search: Record<string, unknown>): { year?: number; version_id?: number } => {
    const year = Number(search.year)
    const version = Number(search.version_id)
    return {
      ...(Number.isInteger(year) && year >= 2025 && year <= 2100 ? { year } : {}),
      ...(Number.isInteger(version) && version > 0 ? { version_id: version } : {}),
    }
  },
  component: PlanningPage,
})
