import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PlanningYearState {
  selectedYear: number | null
  setSelectedYear: (year: number) => void
  clearYear: () => void
}

export const usePlanningYearStore = create<PlanningYearState>()(
  persist(
    set => ({
      selectedYear: null,
      setSelectedYear: year => set({ selectedYear: year }),
      clearYear: () => set({ selectedYear: null }),
    }),
    { name: 'planning-year' }
  )
)
