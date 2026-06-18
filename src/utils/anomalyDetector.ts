import { ContactRecord } from '../types'

export interface AnomalyItem {
  id: string
  category: 'wait-time' | 'abandonment' | 'agent' | 'volume' | 'repeat'
  severity: number
  entity: string
  period: string
  finding: string
  detail: string
  baseline: number
  recent: number
  unit: string
}

function parseDate(str: string): Date | null {
  if (!str || str.trim() === '') return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

function getShift(hour: number): string {
  if (hour >= 6 && hour < 14) return '1st'
  if (hour >= 14 && hour < 22) return '2nd'
  return '3rd'
}

export function detectAnomalies(records: ContactRecord[]): AnomalyItem[] {
  if (records.length === 0) return []

  const items: AnomalyItem[] = []
  const now = new Date(Math.max(...records.map(r => {
    const d = parseDate(r.initiationTimestamp)
    return d ? d.getTime() : 0
  })))
  const last7d = new Date(now.getTime() - 7 * 86400000)
  const last30d = new Date(now.getTime() - 30 * 86400000)

  const allAnswered = records.filter(r => r.connectedToAgentTimestamp)
  const recent7 = records.filter(r => {
    const d = parseDate(r.initiationTimestamp)
    return d && d >= last7d
  })
  const recent30 = records.filter(r => {
    const d = parseDate(r.initiationTimestamp)
    return d && d >= last30d
  })
  const recent7Answered = recent7.filter(r => r.connectedToAgentTimestamp)

  const overallMean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  const overallStd = (arr: number[]) => {
    if (arr.length < 2) return 0
    const m = overallMean(arr)
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1))
  }

  // --- Wait-time outliers: SLA≤60s drops by queue in last 7d ---
  const queueSlaAll: Record<string, { total: number; met: number }> = {}
  for (const r of allAnswered) {
    const d1 = parseDate(r.initiationTimestamp)
    const d2 = parseDate(r.connectedToAgentTimestamp)
    if (!d1 || !d2) continue
    const queue = r.queue || '(none)'
    if (!queueSlaAll[queue]) queueSlaAll[queue] = { total: 0, met: 0 }
    queueSlaAll[queue].total++
    if ((d2.getTime() - d1.getTime()) / 1000 <= 60) queueSlaAll[queue].met++
  }
  const queueSla7: Record<string, { total: number; met: number }> = {}
  for (const r of recent7Answered) {
    const d1 = parseDate(r.initiationTimestamp)
    const d2 = parseDate(r.connectedToAgentTimestamp)
    if (!d1 || !d2) continue
    const queue = r.queue || '(none)'
    if (!queueSla7[queue]) queueSla7[queue] = { total: 0, met: 0 }
    queueSla7[queue].total++
    if ((d2.getTime() - d1.getTime()) / 1000 <= 60) queueSla7[queue].met++
  }
  for (const [queue, all] of Object.entries(queueSlaAll)) {
    const recent = queueSla7[queue]
    if (!recent || recent.total < 5) continue
    const allPct = all.total > 0 ? (all.met / all.total) * 100 : 0
    const recentPct = recent.total > 0 ? (recent.met / recent.total) * 100 : 0
    const drop = allPct - recentPct
    if (drop >= 5) {
      items.push({
        id: `sla-queue-${queue}`,
        category: 'wait-time',
        severity: Math.min(Math.round(drop), 10),
        entity: queue,
        period: '7d',
        finding: `SLA≤60s dropped ${drop.toFixed(1)} pts in last 7d`,
        detail: `${recentPct.toFixed(1)}% recently vs ${allPct.toFixed(1)}% baseline (n=${recent.total})`,
        baseline: Math.round(allPct * 10) / 10,
        recent: Math.round(recentPct * 10) / 10,
        unit: '%',
      })
    }
  }

  // --- Agent SLA drops ---
  const agentSlaAll: Record<string, { total: number; met: number }> = {}
  for (const r of allAnswered) {
    const d1 = parseDate(r.initiationTimestamp)
    const d2 = parseDate(r.connectedToAgentTimestamp)
    if (!d1 || !d2) continue
    const agent = r.agent || '(none)'
    if (!agentSlaAll[agent]) agentSlaAll[agent] = { total: 0, met: 0 }
    agentSlaAll[agent].total++
    if ((d2.getTime() - d1.getTime()) / 1000 <= 60) agentSlaAll[agent].met++
  }
  const agentSla7: Record<string, { total: number; met: number }> = {}
  for (const r of recent7Answered) {
    const d1 = parseDate(r.initiationTimestamp)
    const d2 = parseDate(r.connectedToAgentTimestamp)
    if (!d1 || !d2) continue
    const agent = r.agent || '(none)'
    if (!agentSla7[agent]) agentSla7[agent] = { total: 0, met: 0 }
    agentSla7[agent].total++
    if ((d2.getTime() - d1.getTime()) / 1000 <= 60) agentSla7[agent].met++
  }
  for (const [agent, all] of Object.entries(agentSlaAll)) {
    const recent = agentSla7[agent]
    if (!recent || recent.total < 3) continue
    const allPct = all.total > 0 ? (all.met / all.total) * 100 : 0
    const recentPct = recent.total > 0 ? (recent.met / recent.total) * 100 : 0
    const drop = allPct - recentPct
    if (drop >= 10) {
      items.push({
        id: `sla-agent-${agent}`,
        category: 'wait-time',
        severity: Math.min(Math.round(drop / 5), 10),
        entity: agent,
        period: '7d',
        finding: `SLA≤60s dropped ${drop.toFixed(1)} pts in last 7d`,
        detail: `${recentPct.toFixed(1)}% recently vs ${allPct.toFixed(1)}% baseline (n=${recent.total})`,
        baseline: Math.round(allPct * 10) / 10,
        recent: Math.round(recentPct * 10) / 10,
        unit: '%',
      })
    }
  }

  // --- Abandonment hotspots ---
  const queueAbandonAll: Record<string, { total: number; abandoned: number }> = {}
  for (const r of records) {
    const queue = r.queue || '(none)'
    if (!queueAbandonAll[queue]) queueAbandonAll[queue] = { total: 0, abandoned: 0 }
    queueAbandonAll[queue].total++
    if (!r.connectedToAgentTimestamp) queueAbandonAll[queue].abandoned++
  }
  const queueAbandon7: Record<string, { total: number; abandoned: number }> = {}
  for (const r of recent7) {
    const queue = r.queue || '(none)'
    if (!queueAbandon7[queue]) queueAbandon7[queue] = { total: 0, abandoned: 0 }
    queueAbandon7[queue].total++
    if (!r.connectedToAgentTimestamp) queueAbandon7[queue].abandoned++
  }
  for (const [queue, all] of Object.entries(queueAbandonAll)) {
    if (all.total < 5) continue
    const allPct = (all.abandoned / all.total) * 100
    if (allPct < 15) continue
    const recent = queueAbandon7[queue]
    const recentPct = recent && recent.total >= 3 ? (recent.abandoned / recent.total) * 100 : allPct
    const bump = recentPct - allPct
    items.push({
      id: `abandon-queue-${queue}`,
      category: 'abandonment',
      severity: Math.min(Math.round(allPct / 10), 10),
      entity: queue,
      period: bump >= 3 ? '7d increase' : 'all-time',
      finding: `${allPct.toFixed(1)}% abandonment rate`,
      detail: `${all.abandoned} of ${all.total} contacts${bump >= 3 ? ` (${bump >= 0 ? '+' : ''}${bump.toFixed(1)} pts in 7d)` : ''}`,
      baseline: Math.round(allPct * 10) / 10,
      recent: Math.round(recentPct * 10) / 10,
      unit: '%',
    })
  }

  // --- Agent behavior: multi-attempt, excessive ACW ---
  const allConnectSecs = allAnswered
    .map(r => {
      const d1 = parseDate(r.initiationTimestamp)
      const d2 = parseDate(r.connectedToAgentTimestamp)
      return d1 && d2 ? (d2.getTime() - d1.getTime()) / 1000 : null
    })
    .filter((v): v is number => v !== null)
  const connectMean = overallMean(allConnectSecs)

  const agentGroups: Record<string, {
    total: number
    multiAttempt: number
    connectSecs: number[]
    acwMins: number[]
  }> = {}
  for (const r of records) {
    const agent = r.agent?.trim()
    if (!agent) continue
    if (!agentGroups[agent]) agentGroups[agent] = { total: 0, multiAttempt: 0, connectSecs: [], acwMins: [] }
    agentGroups[agent].total++
    const attempts = parseInt(r.agentConnectionAttempts, 10)
    if (!isNaN(attempts) && attempts > 1) agentGroups[agent].multiAttempt++
    if (r.connectedToAgentTimestamp) {
      const d1 = parseDate(r.initiationTimestamp)
      const d2 = parseDate(r.connectedToAgentTimestamp)
      if (d1 && d2) agentGroups[agent].connectSecs.push((d2.getTime() - d1.getTime()) / 1000)
    }
    const acwStart = parseDate(r.acwStartTimestamp)
    const acwEnd = parseDate(r.acwEndTimestamp)
    if (acwStart && acwEnd) agentGroups[agent].acwMins.push((acwEnd.getTime() - acwStart.getTime()) / 60000)
  }

  const allAcwMins = Object.values(agentGroups).flatMap(g => g.acwMins)
  const acwMean = overallMean(allAcwMins)
  const acwStd = overallStd(allAcwMins)

  for (const [agent, g] of Object.entries(agentGroups)) {
    if (g.total < 5) continue
    const multiPct = (g.multiAttempt / g.total) * 100
    if (multiPct >= 20) {
      items.push({
        id: `multi-attempt-${agent}`,
        category: 'agent',
        severity: Math.min(Math.round(multiPct / 10), 10),
        entity: agent,
        period: 'all-time',
        finding: `${multiPct.toFixed(1)}% multi-attempt contacts`,
        detail: `${g.multiAttempt} of ${g.total} contacts required >1 agent connection attempt`,
        baseline: 0,
        recent: Math.round(multiPct * 10) / 10,
        unit: '%',
      })
    }
    if (g.acwMins.length >= 3 && acwStd > 0) {
      const avgAcw = overallMean(g.acwMins)
      const z = (avgAcw - acwMean) / acwStd
      if (Math.abs(z) >= 2) {
        items.push({
          id: `acw-${agent}`,
          category: 'agent',
          severity: Math.min(Math.round(Math.abs(z)), 10),
          entity: agent,
          period: 'all-time',
          finding: `ACW z-score ${z.toFixed(1)} (avg ${avgAcw.toFixed(1)} min vs baseline ${acwMean.toFixed(1)} min)`,
          detail: `n=${g.acwMins.length} contacts`,
          baseline: Math.round(acwMean * 10) / 10,
          recent: Math.round(avgAcw * 10) / 10,
          unit: 'min',
        })
      }
    }
  }

  // --- Repeat contacts (same customer phone within 24h) ---
  const phoneFirstSeen: Record<string, Date> = {}
  let repeatCount = 0
  for (const r of records) {
    const phone = r.customerPhoneNumber
    if (!phone) continue
    const d = parseDate(r.initiationTimestamp)
    if (!d) continue
    if (phoneFirstSeen[phone]) {
      const hoursDiff = (d.getTime() - phoneFirstSeen[phone].getTime()) / 3600000
      if (hoursDiff <= 24 && hoursDiff > 0) repeatCount++
    }
    if (!phoneFirstSeen[phone] || d < phoneFirstSeen[phone]) {
      phoneFirstSeen[phone] = d
    }
  }
  const repeatPct = records.length > 0 ? (repeatCount / records.length) * 100 : 0
  if (repeatPct >= 5) {
    items.push({
      id: 'repeat-contacts',
      category: 'repeat',
      severity: Math.min(Math.round(repeatPct / 5), 10),
      entity: 'All contacts',
      period: 'all-time',
      finding: `${repeatPct.toFixed(1)}% repeat contacts within 24h`,
      detail: `${repeatCount.toLocaleString()} contacts from customers who called again within 24 hours`,
      baseline: 0,
      recent: Math.round(repeatPct * 10) / 10,
      unit: '%',
    })
  }

  // --- Volume anomalies (z-score on daily counts) ---
  const dailyCounts: Record<string, number> = {}
  for (const r of records) {
    const d = parseDate(r.initiationTimestamp)
    if (!d) continue
    const key = d.toISOString().slice(0, 10)
    dailyCounts[key] = (dailyCounts[key] || 0) + 1
  }
  const dailyValues = Object.values(dailyCounts)
  const volMean = overallMean(dailyValues)
  const volStd = overallStd(dailyValues)
  if (volStd > 0) {
    for (const [date, count] of Object.entries(dailyCounts)) {
      const z = (count - volMean) / volStd
      if (Math.abs(z) >= 2.5) {
        items.push({
          id: `volume-${date}`,
          category: 'volume',
          severity: Math.min(Math.round(Math.abs(z)), 10),
          entity: date,
          period: 'daily',
          finding: `${z > 0 ? 'Spike' : 'Drop'}: ${count} contacts (z=${z.toFixed(1)})`,
          detail: `Baseline: ${Math.round(volMean)} contacts/day`,
          baseline: Math.round(volMean),
          recent: count,
          unit: 'contacts',
        })
      }
    }
  }

  items.sort((a, b) => b.severity - a.severity)
  return items
}