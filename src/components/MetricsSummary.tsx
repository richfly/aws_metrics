import { useState } from 'react'
import { Paper, Text, Group, ActionIcon, Tooltip, Divider } from '@mantine/core'
import { motion } from 'framer-motion'
import { IconCopy, IconCheck } from '@tabler/icons-react'
import { DetailedMetrics } from '../types'
import { copyToClipboard, formatSummaryText } from '../utils/exportUtils'

interface MetricsSummaryProps {
  metrics: DetailedMetrics
  totalRecords: number
  filteredRecords: number
  filterLabel: string
}

export function MetricsSummary({ metrics, totalRecords, filteredRecords, filterLabel }: MetricsSummaryProps) {
  const [copied, setCopied] = useState(false)
  const isFiltered = filteredRecords < totalRecords

  const handleCopy = async () => {
    const text = formatSummaryText(metrics, filterLabel, totalRecords, filteredRecords)
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rows: Array<{
    label: string
    stats: typeof metrics.agentConnectTime
  }> = [
    { label: 'Agent Connect Time', stats: metrics.agentConnectTime },
    { label: 'Handle Time', stats: metrics.handleTime },
    { label: 'After ACW Time', stats: metrics.acwTime },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Paper shadow="sm" radius="xl" p="md" className="glass-panel">
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={600} size="lg">Metrics Summary</Text>
            <Text size="xs" c="dimmed">
              {filteredRecords.toLocaleString()} of {totalRecords.toLocaleString()} records
              {isFiltered && ` (filtered)`}
              {filterLabel && ` \u2014 ${filterLabel}`}
            </Text>
          </div>
          <Tooltip label={copied ? 'Copied!' : 'Copy summary to clipboard'}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              radius="xl"
              onClick={handleCopy}
              style={{ opacity: 0.3, transition: 'opacity 0.2s' }}
              className="copy-btn-hover"
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group mb="xs" px="xs">
          <Text size="xs" c="dimmed" style={{ width: 160 }}>Metric</Text>
          <Text size="xs" c="dimmed" ta="right" style={{ width: 64 }}>Avg</Text>
          <Text size="xs" c="dimmed" ta="right" style={{ width: 64 }}>Min</Text>
          <Text size="xs" c="dimmed" ta="right" style={{ width: 64 }}>Max</Text>
          <Text size="xs" c="dimmed" ta="right" style={{ width: 64 }}>Median</Text>
          <Text size="xs" c="dimmed" ta="right" style={{ width: 48 }}>N</Text>
        </Group>

        <Divider mb="xs" />

        {rows.map(({ label, stats }) => (
          <Group key={label} px="xs" py={6}>
            <Text size="sm" fw={500} style={{ width: 160 }}>{label}</Text>
            {stats ? (
              <>
                <Text size="sm" fw={600} ta="right" style={{ width: 64 }}>{stats.avg.toFixed(2)}</Text>
                <Text size="sm" c="dimmed" ta="right" style={{ width: 64 }}>{stats.min.toFixed(2)}</Text>
                <Text size="sm" c="dimmed" ta="right" style={{ width: 64 }}>{stats.max.toFixed(2)}</Text>
                <Text size="sm" c="dimmed" ta="right" style={{ width: 64 }}>{stats.median.toFixed(2)}</Text>
                <Text size="sm" c="dimmed" ta="right" style={{ width: 48 }}>{stats.count}</Text>
              </>
            ) : (
              <Text size="sm" c="dimmed" style={{ width: 304 }}>—</Text>
            )}
          </Group>
        ))}
      </Paper>
    </motion.div>
  )
}
