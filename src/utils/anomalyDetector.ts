import { ContactRecord } from '../types'

export interface AnomalyItem {
  id: string
  category: 'wait-time' | 'abandonment' | 'agent' | 'volume' | 'repeat' | 'data-quality'
  severity: number
  entity: string
  period: string
  finding: string
  detail: string
  baseline: number
  recent: number
  unit: string
  description: string
  recommendation: string
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
        description: `The "${queue}" queue's service level — the percentage of calls answered within 60 seconds — has fallen by ${drop.toFixed(1)} percentage points over the last 7 days compared to the all-time baseline of ${allPct.toFixed(1)}%. This means customers in this queue are waiting longer before reaching an agent.`,
        recommendation: drop >= 15
          ? `Urgent: Investigate staffing levels on the "${queue}" queue during peak hours. Consider rebalancing agents from lower-volume queues or adding overflow routing. Check if agents assigned to this queue have increased ACW time or multi-attempt rates.`
          : `Review recent schedule changes, agent availability, and call volume trends for the "${queue}" queue. Check if new agents are assigned without adequate training, or if there are routing profile changes.`,
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
        description: `Agent "${agent}" has seen a ${drop.toFixed(1)}-point drop in their SLA≤60s rate over the last 7 days, falling from an all-time average of ${allPct.toFixed(1)}% to ${recentPct.toFixed(1)}%. This indicates that a larger share of this agent's calls are taking longer to connect.`,
        recommendation: `Check if "${agent}" has recent schedule changes, is handling more complex calls, or is experiencing higher multi-attempt rates. A coaching session or call review may help identify the root cause. Consider temporary queue reassignment if the trend continues.`,
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
      description: `The "${queue}" queue has an abandonment rate of ${allPct.toFixed(1)}%. ${bump >= 3 ? `This has increased by ${bump.toFixed(1)} percentage points in the last 7 days compared to the all-time baseline.` : 'This is significantly above the overall average, meaning customers in this queue are far more likely to hang up before reaching an agent.'} ${allPct >= 80 ? 'At this level, most customers never reach an agent.' : ''}`,
      recommendation: allPct >= 80
        ? `Critical: The "${queue}" queue appears to function as a dead-end or overflow queue with no agent coverage. Evaluate whether this queue should have agents assigned, whether calls should be rerouted, or if the queue should be decommissioned. Customers reaching this queue have almost no chance of being served.`
        : `Review staffing levels during peak hours for the "${queue}" queue. Check if queue-time SLA thresholds are being met. Consider adding overflow routing to backup queues or adjusting the IVR to set better customer expectations with estimated wait times.`,
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
    if (acwStart && acwEnd) {
      const acwMin = (acwEnd.getTime() - acwStart.getTime()) / 60000
      agentGroups[agent].acwMins.push(acwMin)
    }
  }

  const ACW_CAP = 30
  const allAcwMins = Object.values(agentGroups).flatMap(g => g.acwMins.filter(m => m <= ACW_CAP))
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
        description: `Agent "${agent}" has a multi-attempt rate of ${multiPct.toFixed(1)}%. This means ${g.multiAttempt} of their ${g.total} contacts required more than one connection attempt before the agent successfully answered. High multi-attempt rates indicate that the agent is declining or missing initial connection attempts, which increases customer wait time and wastes routing capacity.`,
        recommendation: `Review "${agent}"'s agent connection attempts in detail. Common causes include: (1) agent not accepting calls promptly, (2) agent toggling status during active routing, (3) technical issues with the agent's softphone or connection. Consider coaching on availability status management and first-attempt answer rates.`,
      })
    }
    const cappedAcw = g.acwMins.filter(m => m <= ACW_CAP)
    if (cappedAcw.length >= 3 && acwStd > 0) {
      const avgAcw = overallMean(cappedAcw)
      const z = (avgAcw - acwMean) / acwStd
      if (Math.abs(z) >= 2) {
        items.push({
          id: `acw-${agent}`,
          category: 'agent',
          severity: Math.min(Math.round(Math.abs(z)), 10),
          entity: agent,
          period: 'all-time',
          finding: `ACW z-score ${z.toFixed(1)} (avg ${avgAcw.toFixed(1)} min vs baseline ${acwMean.toFixed(1)} min)`,
          detail: `n=${cappedAcw.length} contacts (ACW values >30 min excluded from avg)`,
          baseline: Math.round(acwMean * 10) / 10,
          recent: Math.round(avgAcw * 10) / 10,
          unit: 'min',
          description: `Agent "${agent}" has an average After-Contact Work (ACW) time of ${avgAcw.toFixed(1)} minutes, which is ${Math.abs(z).toFixed(1)} standard deviations ${z > 0 ? 'above' : 'below'} the team baseline of ${acwMean.toFixed(1)} minutes. ${z > 0 ? 'Excessively high ACW time means the agent is spending significantly longer than peers wrapping up after each call, reducing their availability for new contacts.' : 'Unusually low ACW time may indicate the agent is skipping wrap-up tasks, which could affect data quality or after-call documentation.'} ACW values exceeding 30 minutes (likely forgotten open states) are excluded from this calculation.`,
          recommendation: z > 0
            ? `Investigate whether "${agent}" is handling more complex call types, struggling with post-call processes, or experiencing system delays. Consider setting ACW time limits or adding reminder notifications. Review whether any contacts show ACW times over 30 minutes, which likely indicate forgotten open states rather than real work.`
            : `Review whether "${agent}"'s low ACW time is due to efficient processes or shortcutting required wrap-up work. Verify after-call documentation quality and compliance requirements are being met.`,
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
      description: `${repeatPct.toFixed(1)}% of all contacts are from customers who called back within 24 hours of their previous contact. This is a first-call resolution (FCR) indicator — a high rate means customers are not getting their issues resolved on the first contact, forcing them to call back. Industry benchmark for FCR is typically 70-75%, meaning 25-30% repeat contact is common, but rates above 40-50% signal systemic issues.`,
      recommendation: `Analyze the top reasons for repeat contacts: (1) Check which queues have the highest repeat rates — they may need better agent training or authority to resolve issues. (2) Review disconnect reasons for first contacts that led to callbacks — are customers being disconnected? (3) Consider implementing callback or scheduled contact options to reduce repeat volume. (4) Review whether self-service options (IVR, chatbot) could deflect common repeat issues.`,
    })
  }

  // --- Data quality: forgotten ACW states ---
  const forgottenAcwAgents: { agent: string; forgottenCount: number; totalAcw: number; maxAcwMin: number }[] = []
  for (const [agent, g] of Object.entries(agentGroups)) {
    if (g.acwMins.length === 0) continue
    const forgotten = g.acwMins.filter(m => m > ACW_CAP)
    if (forgotten.length > 0) {
      forgottenAcwAgents.push({
        agent,
        forgottenCount: forgotten.length,
        totalAcw: g.acwMins.length,
        maxAcwMin: Math.max(...g.acwMins),
      })
    }
  }
  forgottenAcwAgents.sort((a, b) => b.maxAcwMin - a.maxAcwMin)
  const totalForgotten = forgottenAcwAgents.reduce((s, a) => s + a.forgottenCount, 0)
  if (totalForgotten > 0) {
    const totalAcwRecords = Object.values(agentGroups).reduce((s, g) => s + g.acwMins.length, 0)
    const forgottenPct = totalAcwRecords > 0 ? (totalForgotten / totalAcwRecords) * 100 : 0
    const worstAgent = forgottenAcwAgents[0]
    items.push({
      id: 'data-quality-forgotten-acw',
      category: 'data-quality',
      severity: Math.min(Math.round(forgottenPct / 2), 10),
      entity: `${forgottenAcwAgents.length} agent(s)`,
      period: 'all-time',
      finding: `${totalForgotten} forgotten ACW states (>${ACW_CAP} min) across ${forgottenAcwAgents.length} agent(s)`,
      detail: `Worst: ${worstAgent.agent} has ACW up to ${Math.round(worstAgent.maxAcwMin)} min. ${forgottenPct.toFixed(1)}% of all ACW records exceed ${ACW_CAP} min and are likely data quality issues.`,
      baseline: 0,
      recent: Math.round(forgottenPct * 10) / 10,
      unit: '%',
      description: `After-Contact Work (ACW) times exceeding ${ACW_CAP} minutes are almost certainly not real work — they represent agents who left contacts in ACW state and never closed them. The longest recorded ACW in the dataset is ${Math.round(worstAgent.maxAcwMin)} minutes (${(worstAgent.maxAcwMin / 60).toFixed(1)} hours), which is physically impossible for after-call wrap-up. These inflated values skew all ACW averages and make agent comparisons unreliable. ${forgottenAcwAgents.length} agent(s) have at least one ACW record over ${ACW_CAP} minutes, totaling ${totalForgotten} records (${forgottenPct.toFixed(1)}% of all ACW data).`,
      recommendation: `(1) Check the Amazon Connect CCP or supervisor dashboard for contacts currently stuck in ACW state and close them. (2) Implement an ACW timeout policy (e.g., auto-close ACW after 10 minutes). (3) Add a supervisor alert for any ACW state lasting over ${ACW_CAP} minutes. (4) Consider excluding ACW values >${ACW_CAP} min from agent performance calculations — these anomalies are already filtered from the ACW z-score comparison above.`,
    })
    for (const fa of forgottenAcwAgents.slice(0, 3)) {
      if (fa.maxAcwMin > 120) {
        items.push({
          id: `data-quality-acw-${fa.agent}`,
          category: 'data-quality',
          severity: Math.min(Math.round(fa.maxAcwMin / 60), 10),
          entity: fa.agent,
          period: 'all-time',
          finding: `ACW up to ${Math.round(fa.maxAcwMin)} min (${(fa.maxAcwMin / 60).toFixed(1)} hrs)`,
          detail: `${fa.forgottenCount} of ${fa.totalAcw} ACW records exceed ${ACW_CAP} min`,
          baseline: 0,
          recent: Math.round(fa.maxAcwMin),
          unit: 'min',
          description: `Agent "${fa.agent}" has ACW records lasting up to ${Math.round(fa.maxAcwMin)} minutes (${(fa.maxAcwMin / 60).toFixed(1)} hours). This is almost certainly a forgotten open ACW state rather than actual after-call work. Normal ACW ranges from 30 seconds to 10 minutes. This data quality issue inflates this agent's average ACW time and makes comparisons unreliable.`,
          recommendation: `Contact "${fa.agent}" or their supervisor to close any open ACW states. Implement an automated ACW timeout or supervisor alert for ACW exceeding ${ACW_CAP} minutes.`,
        })
      }
    }
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
          description: `On ${date}, the contact center ${z > 0 ? 'received' : 'handled'} ${count} contacts, which is ${Math.abs(z).toFixed(1)} standard deviations ${z > 0 ? 'above' : 'below'} the daily average of ${Math.round(volMean)} contacts. ${z > 0 ? 'This is an unusually high volume day that may indicate a marketing campaign, system incident, or seasonal event driving inbound traffic.' : 'This is an unusually low volume day that may indicate a holiday, system outage, or data gap.'}`,
          recommendation: z > 0
            ? `For volume spikes: (1) Check if a marketing campaign, product launch, or external event drove the increase. (2) Review abandonment rates during the spike — did they rise? (3) Assess whether staffing was adequate; if SLA dropped, plan scheduling buffers for similar events. (4) Consider proactive staffing adjustments for predictable recurring spikes.`
            : `For volume drops: (1) Verify this isn't a data gap — check if contacts were properly recorded. (2) Compare to the same day of week in other weeks to confirm it's truly anomalous. (3) If confirmed, this may represent a low-cost staffing optimization opportunity.`,
        })
      }
    }
  }

  items.sort((a, b) => b.severity - a.severity)
  return items
}