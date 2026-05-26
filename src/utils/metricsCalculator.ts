import { ContactRecord, MetricStats, DetailedMetrics } from '../types'

function parseDate(str: string): Date | null {
  if (!str || str.trim() === '') return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

function minutesDiff(start: string, end: string): number | null {
  const d1 = parseDate(start)
  const d2 = parseDate(end)
  if (!d1 || !d2) return null
  return (d2.getTime() - d1.getTime()) / 60000
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
