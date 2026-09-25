import { createFileRoute } from '@tanstack/react-router'
import YearSelectionPage from '@/pages/year-selection/YearSelectionPage'

export const Route = createFileRoute('/_authenticated/year-selection/')({
  component: YearSelectionPage,
})
