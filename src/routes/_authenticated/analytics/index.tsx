import { createFileRoute } from '@tanstack/react-router'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'

export const Route = createFileRoute('/_authenticated/analytics/')({
  component: AnalyticsPage,
})
