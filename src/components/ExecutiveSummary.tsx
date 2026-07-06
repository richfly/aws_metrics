import { Text, Paper } from '@mantine/core'
import { motion } from 'framer-motion'
import { DetailedMetrics } from '../types'
import { formatMinutes } from '../utils/metricsCalculator'

interface ExecutiveSummaryProps {
  totalRecords: number
  filteredRecords: number
  metrics: DetailedMetrics | null
  overallMetrics: DetailedMetrics | null
  filterLabel: string
}

function deltaPct(filtered: number | null, overall: number | null): number | null {
  if (filtered === null || overall === null || overall === 0) return null
  return ((filtered - overall) / overall) * 100
}

export function ExecutiveSummary({
  totalRecords,
  filteredRecords,
  metrics,
  overallMetrics,
  filterLabel,
}: ExecutiveSummaryProps) {
  if (!metrics) return null

  const isFiltered = filteredRecords < totalRecords && !!filterLabel

  const connectAvg = metrics.agentConnectTime?.avg ?? null
  const handleAvg = metrics.handleTime?.avg ?? null
  const acwAvg = metrics.acwTime?.avg ?? null

  if (connectAvg === null && handleAvg === null && acwAvg === null) return null

  let sentence = ''

  if (isFiltered) {
    const primary = connectAvg ?? handleAvg ?? acwAvg
    const overallAvg = connectAvg !== null
      ? overallMetrics?.agentConnectTime?.avg ?? null
      : handleAvg !== null
        ? overallMetrics?.handleTime?.avg ?? null
        : overallMetrics?.acwTime?.avg ?? null
    const dp = deltaPct(primary, overallAvg)

    const metricName = connectAvg !== null ? 'connect' : handleAvg !== null ? 'handle' : 'ACW'

    const prefix = filterLabel.length > 60
      ? 'With current filters'
      : `In ${filterLabel}`

    sentence = `${prefix}, agents average ${formatMinutes(primary!)} ${metricName} time`
    if (dp !== null && Math.abs(dp) > 1) {
      const dir = dp < 0 ? 'faster' : 'slower'
      sentence += ` \u2014 ${Math.abs(dp).toFixed(0)}% ${dir} than the overall ${formatMinutes(overallAvg!)} average`
    }
    sentence += '.'
  } else {
    const parts: string[] = []
    if (connectAvg !== null) parts.push(`${formatMinutes(connectAvg)} connect time`)
    if (handleAvg !== null) parts.push(`${formatMinutes(handleAvg)} handle time`)
    if (acwAvg !== null) parts.push(`${formatMinutes(acwAvg)} after-call work`)

    if (parts.length > 0) {
      const last = parts.pop()!
      sentence = `Across ${filteredRecords.toLocaleString()} contacts, agents average ${parts.length > 0 ? parts.join(', ') + ' and ' : ''}${last}.`
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Paper shadow="sm" p="sm" radius="md" className="glass-panel">
        <Text size="sm" fw={500}>
          {sentence}
        </Text>
      </Paper>
    </motion.div>
  )
}
