import { createFileRoute } from '@tanstack/react-router'
import ProjetsPage from '@/pages/projets/ProjetsPage'

export const Route = createFileRoute('/_authenticated/projets/')({
  component: ProjetsPage,
})
