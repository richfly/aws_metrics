export const SHIFT_COLORS: Record<string, string> = {
  "1st": "var(--mantine-color-blue-6)",
  "2nd": "var(--mantine-color-orange-7)",
  "3rd": "var(--mantine-color-violet-6)",
}

export const SHIFT_LABELS: Record<string, string> = {
  "1st": "1st (6:00–13:59)",
  "2nd": "2nd (14:00–21:59)",
  "3rd": "3rd (22:00–5:59)",
}

export const SHIFTS = ["1st", "2nd", "3rd"] as const
export type Shift = (typeof SHIFTS)[number]

export function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split("-")
  return `${parts[1]}/${parts[2]}`
}

export function labelFormatter(label: unknown): string {
  const parts = String(label).split("-")
  return `${parts[1]}/${parts[2]}/${parts[0]}`
}

interface SlaRow {
  date: string
  weekStart: string
  shift: string
  total: number
  below20s: number
  below60s: number
  below120s: number
}

interface WeeklyRow extends SlaRow {
  pct20s: number
  pct60s: number
  pct120s: number
}

export function aggregateByWeek<R extends SlaRow>(rows: R[]): WeeklyRow[] {
  const map = new Map<string, {
    weekStart: string
    shift: string
    total: number
    below20s: number
    below60s: number
    below120s: number
  }>()

  for (const r of rows) {
    const key = `${r.weekStart}|${r.shift}`
    let g = map.get(key)
    if (!g) {
      g = {
        weekStart: r.weekStart,
        shift: r.shift,
        total: 0,
        below20s: 0,
        below60s: 0,
        below120s: 0,
      }
      map.set(key, g)
    }
    g.total += r.total
    g.below20s += r.below20s
    g.below60s += r.below60s
    g.below120s += r.below120s
  }

  return [...map.values()]
    .map((g) => ({
      date: g.weekStart,
      weekStart: g.weekStart,
      shift: g.shift,
      total: g.total,
      below20s: g.below20s,
      below60s: g.below60s,
      below120s: g.below120s,
      pct20s: g.total > 0 ? (g.below20s / g.total) * 100 : 0,
      pct60s: g.total > 0 ? (g.below60s / g.total) * 100 : 0,
      pct120s: g.total > 0 ? (g.below120s / g.total) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function buildChartData<R extends SlaRow, F extends string>(
  rows: R[],
  field: F,
  groupByWeek: boolean,
): Array<Record<string, number | string>> {
  const grouped = groupByWeek ? aggregateByWeek(rows) : rows
  const dates = [...new Set(grouped.map((r) => r.date))].sort()
  return dates.map((date) => {
    const row: Record<string, number | string> = { date }
    for (const s of SHIFTS) {
      const found = grouped.find((r) => r.date === date && r.shift === s)
      const val = found ? (found as unknown as Record<string, number>)[field] : 0
      row[s] = Math.round((val ?? 0) * 10) / 10
    }
    return row
  })
}

export function buildVolumeData<R extends SlaRow>(
  rows: R[],
  groupByWeek: boolean,
): Array<Record<string, number | string>> {
  const grouped = groupByWeek ? aggregateByWeek(rows) : rows
  const dates = [...new Set(grouped.map((r) => r.date))].sort()
  return dates.map((date) => {
    const row: Record<string, number | string> = { date }
    for (const s of SHIFTS) {
      const found = grouped.find((r) => r.date === date && r.shift === s)
      row[s] = found ? found.total : 0
    }
    return row
  })
}
