import { useMemo } from 'react'
import { Paper, Text, Group, Divider } from '@mantine/core'
import { motion } from 'framer-motion'
import { ContactRecord } from '../types'
import { calculateMetricsByPhoneDescription } from '../utils/metricsCalculator'

interface PhoneDescriptionBreakdownProps {
  records: ContactRecord[]
  totalRecords: number
  filteredRecords: number
  filterLabel: string
}

export function PhoneDescriptionBreakdown({
  records,
  totalRecords,
  filteredRecords,
  filterLabel,
}: PhoneDescriptionBreakdownProps) {
  const groups = useMemo(
    () => calculateMetricsByPhoneDescription(records),
    [records],
  )

  const isFiltered = filteredRecords < totalRecords

  if (totalRecords === 0) {
    return (
      <Paper shadow="sm" radius="md" p="xl" className="glass-panel">
        <Text c="dimmed" ta="center" py="xl">
          No data available. Click "Load Data" in the header to upload contact records.
        </Text>
      </Paper>
    )
  }

  if (groups.length === 0) {
    return (
      <Paper shadow="sm" radius="md" p="xl" className="glass-panel">
        <Text c="dimmed" ta="center" py="xl">
          No contacts have a phone description. Upload the Phone Numbers CSV to enrich records.
        </Text>
      </Paper>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <Paper shadow="sm" radius="md" p="md" className="glass-panel">
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={600} size="lg">KPIs by Phone Description</Text>
            <Text size="xs" c="dimmed">
              {groups.length} phone descriptions
              {filteredRecords > 0 &&
                ` \u2014 ${filteredRecords.toLocaleString()} of ${totalRecords.toLocaleString()} records`}
              {isFiltered && ` (filtered)`}
              {filterLabel && ` \u2014 ${filterLabel}`}
            </Text>
          </div>
        </Group>

        <Group mb="xs" px="xs">
          <Text size="xs" c="dimmed" style={{ width: 200 }}>Phone Description</Text>
          <Text size="xs" c="dimmed" ta="right" style={{ width: 64 }}>Records</Text>
          <Text size="xs" c="dimmed" ta="right" style={{ width: 100 }}>Avg Connect</Text>
          <Text size="xs" c="dimmed" ta="right" style={{ width: 100 }}>Avg Handle</Text>
          <Text size="xs" c="dimmed" ta="right" style={{ width: 100 }}>Avg ACW</Text>
        </Group>

        <Divider mb="xs" />

        {groups.map((g) => (
          <Group key={g.phoneDescription} px="xs" py={6}>
            <Text size="sm" fw={500} style={{ width: 200 }}>{g.phoneDescription}</Text>
            <Text size="sm" fw={600} ta="right" style={{ width: 64 }}>{g.count.toLocaleString()}</Text>
            <Text size="sm" fw={600} ta="right" style={{ width: 100 }}>{g.avgConnectTime.toFixed(2)}</Text>
            <Text size="sm" fw={600} ta="right" style={{ width: 100 }}>{g.avgHandleTime.toFixed(2)}</Text>
            <Text size="sm" fw={600} ta="right" style={{ width: 100 }}>{g.avgAcwTime.toFixed(2)}</Text>
          </Group>
        ))}
      </Paper>
    </motion.div>
  )
}
