import { ContactRecord, MetricStats, DetailedMetrics } from '../types'

export function parseDate(str: string): Date | null {
  if (!str || str.trim() === '') return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export function minutesDiff(start: string, end: string): number | null {
  const d1 = parseDate(start)
  const d2 = parseDate(end)
  if (!d1 || !d2) return null
  return (d2.getTime() - d1.getTime()) / 60000
}

export interface PhoneDescriptionGroup {
  phoneDescription: string
  count: number
  avgConnectTime: number
  avgHandleTime: number
  avgAcwTime: number
}

export function calculateMetricsByPhoneDescription(
  records: ContactRecord[],
): PhoneDescriptionGroup[] {
  const groups = new Map<string, {
    connectTimes: number[]
    handleTimes: number[]
    acwTimes: number[]
  }>()

  for (const r of records) {
    const desc = r.phoneDescription
    if (!desc) continue

    let group = groups.get(desc)
    if (!group) {
      group = { connectTimes: [], handleTimes: [], acwTimes: [] }
      groups.set(desc, group)
    }

    const connect = minutesDiff(r.initiationTimestamp, r.connectedToAgentTimestamp)
    if (connect !== null) group.connectTimes.push(connect)

    const handle = minutesDiff(r.initiationTimestamp, r.disconnectTimestamp)
    if (handle !== null) group.handleTimes.push(handle)

    const acw = minutesDiff(r.acwStartTimestamp, r.acwEndTimestamp)
    if (acw !== null) group.acwTimes.push(acw)
  }

  const result: PhoneDescriptionGroup[] = []

  for (const [phoneDescription, g] of groups) {
    const avgConnect = g.connectTimes.length > 0
      ? g.connectTimes.reduce((a, b) => a + b, 0) / g.connectTimes.length
      : 0
    const avgHandle = g.handleTimes.length > 0
      ? g.handleTimes.reduce((a, b) => a + b, 0) / g.handleTimes.length
      : 0
    const avgAcw = g.acwTimes.length > 0
      ? g.acwTimes.reduce((a, b) => a + b, 0) / g.acwTimes.length
      : 0

    const totalCounts = [g.connectTimes.length, g.handleTimes.length, g.acwTimes.length]
    const count = Math.max(...totalCounts)

    result.push({ phoneDescription, count, avgConnectTime: avgConnect, avgHandleTime: avgHandle, avgAcwTime: avgAcw })
  }

  result.sort((a, b) => a.phoneDescription.localeCompare(b.phoneDescription))

  return result
}

function computeStats(values: number[]): MetricStats | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
  return { avg, min, max, median, count: values.length }
}

export function calculateMetrics(records: ContactRecord[]): DetailedMetrics {
  const connectTimes: number[] = []
  const acwTimes: number[] = []
  const handleTimes: number[] = []

  for (const r of records) {
    const connect = minutesDiff(r.initiationTimestamp, r.connectedToAgentTimestamp)
    if (connect !== null) connectTimes.push(connect)

    const acw = minutesDiff(r.acwStartTimestamp, r.acwEndTimestamp)
    if (acw !== null) acwTimes.push(acw)

    const handle = minutesDiff(r.initiationTimestamp, r.disconnectTimestamp)
    if (handle !== null) handleTimes.push(handle)
  }

  return {
    agentConnectTime: computeStats(connectTimes),
    acwTime: computeStats(acwTimes),
    handleTime: computeStats(handleTimes),
  }
}

function getShift(hour: number): string {
  if (hour >= 6 && hour < 14) return "1st"
  if (hour >= 14 && hour < 22) return "2nd"
  return "3rd"
}

export interface DailySlaRow {
  date: string
  weekStart: string
  shift: string
  total: number
  below20s: number
  below60s: number
  below120s: number
  pct20s: number
  pct60s: number
  pct120s: number
  qBelow20s: number
  qBelow60s: number
  qBelow120s: number
  qPct20s: number
  qPct60s: number
  qPct120s: number
}

function weekStartStr(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toISOString().slice(0, 10)
}

export function calculateDailySla(records: ContactRecord[]): DailySlaRow[] {
  const groups = new Map<string, {
    total: number
    below20s: number
    below60s: number
    below120s: number
    qBelow20s: number
    qBelow60s: number
    qBelow120s: number
  }>()

  for (const r of records) {
    const d = parseDate(r.initiationTimestamp)
    if (!d) continue

    const connectSec = secondsDiff(r.initiationTimestamp, r.connectedToAgentTimestamp)
    if (connectSec === null) continue

    const qSec = secondsDiff(r.enqueueTimestamp, r.connectedToAgentTimestamp)

    const dateStr = d.toISOString().slice(0, 10)
    const ws = weekStartStr(d)
    const hour = d.getHours()
    const shift = getShift(hour)
    const key = `${dateStr}|${shift}`

    let g = groups.get(key)
    if (!g) {
      g = { total: 0, below20s: 0, below60s: 0, below120s: 0, qBelow20s: 0, qBelow60s: 0, qBelow120s: 0 }
      groups.set(key, g)
    }

    g.total++
    if (connectSec <= 120) g.below120s++
    if (connectSec <= 60) g.below60s++
    if (connectSec <= 20) g.below20s++

    if (qSec !== null) {
      if (qSec <= 120) g.qBelow120s++
      if (qSec <= 60) g.qBelow60s++
      if (qSec <= 20) g.qBelow20s++
    }
  }

  const result: DailySlaRow[] = []

  for (const [key, g] of groups) {
    const [date, shift] = key.split("|")
    const dateObj = parseDate(date)
    const ws = dateObj ? weekStartStr(dateObj) : date
    result.push({
      date,
      weekStart: ws,
      shift,
      total: g.total,
      below20s: g.below20s,
      below60s: g.below60s,
      below120s: g.below120s,
      pct20s: (g.below20s / g.total) * 100,
      pct60s: (g.below60s / g.total) * 100,
      pct120s: (g.below120s / g.total) * 100,
      qBelow20s: g.qBelow20s,
      qBelow60s: g.qBelow60s,
      qBelow120s: g.qBelow120s,
      qPct20s: g.qBelow20s > 0 ? (g.qBelow20s / g.total) * 100 : 0,
      qPct60s: g.qBelow60s > 0 ? (g.qBelow60s / g.total) * 100 : 0,
      qPct120s: g.qBelow120s > 0 ? (g.qBelow120s / g.total) * 100 : 0,
    })
  }

  result.sort((a, b) => {
    const dc = a.date.localeCompare(b.date)
    return dc !== 0 ? dc : a.shift.localeCompare(b.shift)
  })

  return result
}

export interface OverallSlaStats {
  total: number
  pct20s: number
  pct60s: number
  pct120s: number
  qPct20s: number
  qPct60s: number
  qPct120s: number
}

export function calculateOverallSla(records: ContactRecord[]): OverallSlaStats {
  let total = 0
  let below20s = 0
  let below60s = 0
  let below120s = 0
  let qBelow20s = 0
  let qBelow60s = 0
  let qBelow120s = 0

  for (const r of records) {
    const connectSec = secondsDiff(r.initiationTimestamp, r.connectedToAgentTimestamp)
    if (connectSec === null) continue

    total++
    if (connectSec <= 120) below120s++
    if (connectSec <= 60) below60s++
    if (connectSec <= 20) below20s++

    const qSec = secondsDiff(r.enqueueTimestamp, r.connectedToAgentTimestamp)
    if (qSec !== null) {
      if (qSec <= 120) qBelow120s++
      if (qSec <= 60) qBelow60s++
      if (qSec <= 20) qBelow20s++
    }
  }

  return {
    total,
    pct20s: total > 0 ? (below20s / total) * 100 : 0,
    pct60s: total > 0 ? (below60s / total) * 100 : 0,
    pct120s: total > 0 ? (below120s / total) * 100 : 0,
    qPct20s: total > 0 ? (qBelow20s / total) * 100 : 0,
    qPct60s: total > 0 ? (qBelow60s / total) * 100 : 0,
    qPct120s: total > 0 ? (qBelow120s / total) * 100 : 0,
  }
}

export interface ShiftSlaRow {
  shift: string
  total: number
  pct20s: number
  pct60s: number
  pct120s: number
  qPct20s: number
  qPct60s: number
  qPct120s: number
}

export function calculateSlaByShift(records: ContactRecord[]): ShiftSlaRow[] {
  const map = new Map<string, {
    total: number
    below20s: number
    below60s: number
    below120s: number
    qBelow20s: number
    qBelow60s: number
    qBelow120s: number
  }>()

  for (const r of records) {
    const d = parseDate(r.initiationTimestamp)
    if (!d) continue

    const connectSec = secondsDiff(r.initiationTimestamp, r.connectedToAgentTimestamp)
    if (connectSec === null) continue

    const hour = d.getHours()
    const shift = getShift(hour)

    let g = map.get(shift)
    if (!g) {
      g = { total: 0, below20s: 0, below60s: 0, below120s: 0, qBelow20s: 0, qBelow60s: 0, qBelow120s: 0 }
      map.set(shift, g)
    }

    g.total++
    if (connectSec <= 120) g.below120s++
    if (connectSec <= 60) g.below60s++
    if (connectSec <= 20) g.below20s++

    const qSec = secondsDiff(r.enqueueTimestamp, r.connectedToAgentTimestamp)
    if (qSec !== null) {
      if (qSec <= 120) g.qBelow120s++
      if (qSec <= 60) g.qBelow60s++
      if (qSec <= 20) g.qBelow20s++
    }
  }

  return ["1st", "2nd", "3rd"]
    .map((shift) => {
      const g = map.get(shift)
      if (!g) return null
      return {
        shift,
        total: g.total,
        pct20s: (g.below20s / g.total) * 100,
        pct60s: (g.below60s / g.total) * 100,
        pct120s: (g.below120s / g.total) * 100,
        qPct20s: g.qBelow20s > 0 ? (g.qBelow20s / g.total) * 100 : 0,
        qPct60s: g.qBelow60s > 0 ? (g.qBelow60s / g.total) * 100 : 0,
        qPct120s: g.qBelow120s > 0 ? (g.qBelow120s / g.total) * 100 : 0,
      }
    })
    .filter((r): r is ShiftSlaRow => r !== null)
}

function secondsDiff(start: string, end: string): number | null {
  const d1 = parseDate(start)
  const d2 = parseDate(end)
  if (!d1 || !d2) return null
  return (d2.getTime() - d1.getTime()) / 1000
}

// Inclusive SLA: contacts that abandoned are counted in the denominator.
// For abandoned contacts, the wait time is disconnectTimestamp - initiationTimestamp
// (the time the caller waited before hanging up). All three thresholds (20s, 60s, 120s)
// are applied to that wait time — if a caller abandoned within 20s, they met the 20s SLA.

export function calculateInclusiveDailySla(records: ContactRecord[]): DailySlaRow[] {
  const groups = new Map<string, {
    total: number
    below20s: number
    below60s: number
    below120s: number
    qBelow20s: number
    qBelow60s: number
    qBelow120s: number
  }>()

  for (const r of records) {
    const d = parseDate(r.initiationTimestamp)
    if (!d) continue

    let waitSec: number | null
    if (r.connectedToAgentTimestamp) {
      waitSec = secondsDiff(r.initiationTimestamp, r.connectedToAgentTimestamp)
    } else {
      waitSec = secondsDiff(r.initiationTimestamp, r.disconnectTimestamp)
    }
    if (waitSec === null) continue

    const qSec = r.connectedToAgentTimestamp
      ? secondsDiff(r.enqueueTimestamp, r.connectedToAgentTimestamp)
      : null

    const dateStr = d.toISOString().slice(0, 10)
    const ws = weekStartStr(d)
    const hour = d.getHours()
    const shift = getShift(hour)
    const key = `${dateStr}|${shift}`

    let g = groups.get(key)
    if (!g) {
      g = { total: 0, below20s: 0, below60s: 0, below120s: 0, qBelow20s: 0, qBelow60s: 0, qBelow120s: 0 }
      groups.set(key, g)
    }

    g.total++
    if (waitSec <= 120) g.below120s++
    if (waitSec <= 60) g.below60s++
    if (waitSec <= 20) g.below20s++

    if (qSec !== null) {
      if (qSec <= 120) g.qBelow120s++
      if (qSec <= 60) g.qBelow60s++
      if (qSec <= 20) g.qBelow20s++
    }
  }

  const result: DailySlaRow[] = []
  for (const [key, g] of groups) {
    const [date, shift] = key.split("|")
    const dateObj = parseDate(date)
    const ws = dateObj ? weekStartStr(dateObj) : date
    result.push({
      date,
      weekStart: ws,
      shift,
      total: g.total,
      below20s: g.below20s,
      below60s: g.below60s,
      below120s: g.below120s,
      pct20s: (g.below20s / g.total) * 100,
      pct60s: (g.below60s / g.total) * 100,
      pct120s: (g.below120s / g.total) * 100,
      qBelow20s: g.qBelow20s,
      qBelow60s: g.qBelow60s,
      qBelow120s: g.qBelow120s,
      qPct20s: g.qBelow20s > 0 ? (g.qBelow20s / g.total) * 100 : 0,
      qPct60s: g.qBelow60s > 0 ? (g.qBelow60s / g.total) * 100 : 0,
      qPct120s: g.qBelow120s > 0 ? (g.qBelow120s / g.total) * 100 : 0,
    })
  }

  result.sort((a, b) => {
    const dc = a.date.localeCompare(b.date)
    return dc !== 0 ? dc : a.shift.localeCompare(b.shift)
  })

  return result
}

export function calculateInclusiveOverallSla(records: ContactRecord[]): OverallSlaStats {
  let total = 0
  let below20s = 0
  let below60s = 0
  let below120s = 0
  let qBelow20s = 0
  let qBelow60s = 0
  let qBelow120s = 0

  for (const r of records) {
    let waitSec: number | null
    if (r.connectedToAgentTimestamp) {
      waitSec = secondsDiff(r.initiationTimestamp, r.connectedToAgentTimestamp)
    } else {
      waitSec = secondsDiff(r.initiationTimestamp, r.disconnectTimestamp)
    }
    if (waitSec === null) continue

    total++
    if (waitSec <= 120) below120s++
    if (waitSec <= 60) below60s++
    if (waitSec <= 20) below20s++

    const qSec = r.connectedToAgentTimestamp
      ? secondsDiff(r.enqueueTimestamp, r.connectedToAgentTimestamp)
      : null
    if (qSec !== null) {
      if (qSec <= 120) qBelow120s++
      if (qSec <= 60) qBelow60s++
      if (qSec <= 20) qBelow20s++
    }
  }

  return {
    total,
    pct20s: total > 0 ? (below20s / total) * 100 : 0,
    pct60s: total > 0 ? (below60s / total) * 100 : 0,
    pct120s: total > 0 ? (below120s / total) * 100 : 0,
    qPct20s: total > 0 ? (qBelow20s / total) * 100 : 0,
    qPct60s: total > 0 ? (qBelow60s / total) * 100 : 0,
    qPct120s: total > 0 ? (qBelow120s / total) * 100 : 0,
  }
}

export function calculateInclusiveSlaByShift(records: ContactRecord[]): ShiftSlaRow[] {
  const map = new Map<string, {
    total: number
    below20s: number
    below60s: number
    below120s: number
    qBelow20s: number
    qBelow60s: number
    qBelow120s: number
  }>()

  for (const r of records) {
    const d = parseDate(r.initiationTimestamp)
    if (!d) continue

    let waitSec: number | null
    if (r.connectedToAgentTimestamp) {
      waitSec = secondsDiff(r.initiationTimestamp, r.connectedToAgentTimestamp)
    } else {
      waitSec = secondsDiff(r.initiationTimestamp, r.disconnectTimestamp)
    }
    if (waitSec === null) continue

    const hour = d.getHours()
    const shift = getShift(hour)

    let g = map.get(shift)
    if (!g) {
      g = { total: 0, below20s: 0, below60s: 0, below120s: 0, qBelow20s: 0, qBelow60s: 0, qBelow120s: 0 }
      map.set(shift, g)
    }

    g.total++
    if (waitSec <= 120) g.below120s++
    if (waitSec <= 60) g.below60s++
    if (waitSec <= 20) g.below20s++

    const qSec = r.connectedToAgentTimestamp
      ? secondsDiff(r.enqueueTimestamp, r.connectedToAgentTimestamp)
      : null
    if (qSec !== null) {
      if (qSec <= 120) g.qBelow120s++
      if (qSec <= 60) g.qBelow60s++
      if (qSec <= 20) g.qBelow20s++
    }
  }

  return ["1st", "2nd", "3rd"]
    .map((shift) => {
      const g = map.get(shift)
      if (!g) return null
      return {
        shift,
        total: g.total,
        pct20s: (g.below20s / g.total) * 100,
        pct60s: (g.below60s / g.total) * 100,
        pct120s: (g.below120s / g.total) * 100,
        qPct20s: g.qBelow20s > 0 ? (g.qBelow20s / g.total) * 100 : 0,
        qPct60s: g.qBelow60s > 0 ? (g.qBelow60s / g.total) * 100 : 0,
        qPct120s: g.qBelow120s > 0 ? (g.qBelow120s / g.total) * 100 : 0,
      }
    })
    .filter((r): r is ShiftSlaRow => r !== null)
}

export interface InclusiveSlaComparison {
  standard: OverallSlaStats
  inclusive: OverallSlaStats
  abandoned: number
  abandonedSharePct: number
}

export function calculateSlaComparison(records: ContactRecord[]): InclusiveSlaComparison {
  const standard = calculateOverallSla(records)
  const inclusive = calculateInclusiveOverallSla(records)
  const abandoned = records.filter((r) => !r.connectedToAgentTimestamp).length
  const abandonedSharePct = records.length > 0 ? (abandoned / records.length) * 100 : 0
  return { standard, inclusive, abandoned, abandonedSharePct }
}
