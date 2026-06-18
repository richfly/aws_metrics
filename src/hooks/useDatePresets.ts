import { useMemo } from 'react'
import type { DatePreset } from '../components/DatePickerPopover'

export function useDatePresets(mode: "single" | "range"): DatePreset[] {
  return useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startOfDay = (d: Date) => {
      const r = new Date(d)
      r.setHours(0, 0, 0, 0)
      return r
    }
    const endOfDay = (d: Date) => {
      const r = new Date(d)
      r.setHours(23, 59, 59, 999)
      return r
    }
    const daysAgo = (n: number) => {
      const r = new Date(today)
      r.setDate(r.getDate() - n)
      return r
    }

    if (mode === "single") {
      return [
        { value: today, label: "Today" },
        { value: daysAgo(1), label: "Yesterday" },
        { value: daysAgo(7), label: "7 days ago" },
        { value: daysAgo(30), label: "30 days ago" },
      ]
    }

    return [
      { value: [startOfDay(today), endOfDay(today)] as [Date, Date], label: "Today" },
      { value: [daysAgo(1), endOfDay(daysAgo(1))] as [Date, Date], label: "Yesterday" },
      { value: [daysAgo(6), endOfDay(today)] as [Date, Date], label: "Last 7 days" },
      { value: [daysAgo(29), endOfDay(today)] as [Date, Date], label: "Last 30 days" },
      {
        value: [
          startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)),
          endOfDay(today),
        ] as [Date, Date],
        label: "This month",
      },
      {
        value: [
          startOfDay(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
          endOfDay(new Date(today.getFullYear(), today.getMonth(), 0)),
        ] as [Date, Date],
        label: "Last month",
      },
    ]
  }, [mode])
}
