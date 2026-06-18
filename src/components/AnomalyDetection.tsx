import { useMemo, useState } from 'react'
import { Paper, Text, Group, Stack, Badge, SimpleGrid, Modal, Divider, ThemeIcon } from '@mantine/core'
import { IconAlertTriangle, IconClock, IconPhoneOff, IconUser, IconChartBar, IconRefresh, IconAlertHexagon } from '@tabler/icons-react'
import { motion } from 'framer-motion'
import { ContactRecord } from '../types'
import { detectAnomalies, type AnomalyItem } from '../utils/anomalyDetector'

interface AnomalyDetectionProps {
  records: ContactRecord[]
}

const CATEGORY_CONFIG: Record<string, { icon: typeof IconAlertTriangle; color: string; label: string }> = {
  'wait-time': { icon: IconClock, color: 'orange', label: 'Wait-Time' },
  'abandonment': { icon: IconPhoneOff, color: 'red', label: 'Abandonment' },
  'agent': { icon: IconUser, color: 'violet', label: 'Agent Behavior' },
  'volume': { icon: IconChartBar, color: 'blue', label: 'Volume' },
  'repeat': { icon: IconRefresh, color: 'teal', label: 'Repeat Contacts' },
  'data-quality': { icon: IconAlertHexagon, color: 'grape', label: 'Data Quality' },
}

function severityColor(severity: number): string {
  if (severity >= 7) return 'red'
  if (severity >= 4) return 'orange'
  return 'yellow'
}

function severityLabel(severity: number): string {
  if (severity >= 7) return 'Critical'
  if (severity >= 4) return 'Warning'
  return 'Info'
}

function AnomalyCard({ item, onClick }: { item: AnomalyItem; onClick: () => void }) {
  const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG['wait-time']
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Paper
        p="md"
        radius="md"
        withBorder
        style={{
          borderLeft: `4px solid var(--mantine-color-${severityColor(item.severity)}-6)`,
          cursor: 'pointer',
        }}
        onClick={onClick}
      >
        <Group justify="space-between" wrap="nowrap" mb={4}>
          <Group gap="xs" wrap="nowrap">
            <Icon size={18} style={{ color: `var(--mantine-color-${config.color}-6)` }} />
            <Text fw={600} size="sm" lineClamp={1}>
              {item.finding}
            </Text>
          </Group>
          <Badge
            color={severityColor(item.severity)}
            variant="filled"
            size="sm"
            radius="sm"
          >
            {severityLabel(item.severity)}
          </Badge>
        </Group>
        <Group gap="xs" mb={4}>
          <Badge variant="light" color={config.color} size="xs" radius="sm">
            {config.label}
          </Badge>
          <Text size="xs" c="dimmed">
            {item.entity}
          </Text>
          <Text size="xs" c="dimmed">
            &middot; {item.period}
          </Text>
        </Group>
        <Text size="xs" c="dimmed" lineClamp={2}>
          {item.detail}
        </Text>
        {item.baseline !== 0 && item.unit === '%' && (
          <Group gap="xs" mt={4}>
            <Text size="xs" c="dimmed">Baseline:</Text>
            <Text size="xs" fw={600}>{item.baseline}%</Text>
            <Text size="xs" c="dimmed">&rarr;</Text>
            <Text size="xs" fw={600} color={item.recent < item.baseline ? 'red' : 'teal'}>
              {item.recent}%
            </Text>
          </Group>
        )}
        {item.unit !== '%' && item.baseline > 0 && (
          <Group gap="xs" mt={4}>
            <Text size="xs" c="dimmed">Baseline:</Text>
            <Text size="xs" fw={600}>{item.baseline} {item.unit}</Text>
            <Text size="xs" c="dimmed">&rarr;</Text>
            <Text size="xs" fw={600}>{item.recent} {item.unit}</Text>
          </Group>
        )}
      </Paper>
    </motion.div>
  )
}

function AnomalyModal({ item, opened, onClose }: { item: AnomalyItem | null; opened: boolean; onClose: () => void }) {
  if (!item) return null
  const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG['wait-time']
  const Icon = config.icon
  const sevColor = severityColor(item.severity)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon color={sevColor} variant="light" radius="md" size="lg">
            <Icon size={18} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">{item.finding}</Text>
            <Group gap="xs" mt={2}>
              <Badge variant="light" color={config.color} size="xs" radius="sm">
                {config.label}
              </Badge>
              <Badge color={sevColor} variant="filled" size="xs" radius="sm">
                {severityLabel(item.severity)} (severity {item.severity}/10)
              </Badge>
            </Group>
          </div>
        </Group>
      }
      size="lg"
      radius="md"
    >
      <Stack gap="md">
        <Paper p="sm" radius="md" style={{ background: 'var(--mantine-color-dark-7)' }}>
          <Group justify="space-between" gap="xl">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Entity</Text>
              <Text fw={600} size="sm">{item.entity}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Time Period</Text>
              <Text fw={600} size="sm">{item.period}</Text>
            </div>
            {item.baseline !== 0 && (
              <>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Baseline</Text>
                  <Text fw={600} size="sm">{item.baseline}{item.unit === '%' ? '%' : ` ${item.unit}`}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Recent</Text>
                  <Text fw={600} size="sm" color={item.unit === '%' && item.recent < item.baseline ? 'red' : undefined}>
                    {item.recent}{item.unit === '%' ? '%' : ` ${item.unit}`}
                  </Text>
                </div>
              </>
            )}
          </Group>
        </Paper>

        <Divider label="What this means" labelPosition="left" />
        <Text size="sm">
          {item.description}
        </Text>

        <Divider label="Recommended action" labelPosition="left" />
        <Paper p="md" radius="md" style={{ background: 'var(--mantine-color-dark-7)' }}>
          <Text size="sm" fw={500}>
            {item.recommendation}
          </Text>
        </Paper>

        <Divider label="Technical detail" labelPosition="left" />
        <Text size="xs" c="dimmed">
          {item.detail}
        </Text>
        <Text size="xs" c="dimmed" fs="italic">
          Anomaly ID: {item.id} &middot; Severity: {item.severity}/10 &middot; Category: {config.label}
        </Text>
      </Stack>
    </Modal>
  )
}

export function AnomalyDetection({ records }: AnomalyDetectionProps) {
  const anomalies = useMemo(() => detectAnomalies(records), [records])
  const [selected, setSelected] = useState<AnomalyItem | null>(null)

  const byCategory = useMemo(() => {
    const groups: Record<string, AnomalyItem[]> = {}
    for (const a of anomalies) {
      if (!groups[a.category]) groups[a.category] = []
      groups[a.category].push(a)
    }
    return groups
  }, [anomalies])

  const criticalCount = anomalies.filter(a => a.severity >= 7).length
  const warningCount = anomalies.filter(a => a.severity >= 4 && a.severity < 7).length
  const infoCount = anomalies.filter(a => a.severity < 4).length

  if (records.length === 0) {
    return (
      <Paper shadow="sm" radius="md" p="xl" className="glass-panel">
        <Text c="dimmed" ta="center" py="xl">
          No data available. Click &quot;Load Data&quot; in the header to upload contact records.
        </Text>
      </Paper>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <div>
            <Text fw={600} size="lg">Anomaly Detection</Text>
            <Text size="xs" c="dimmed">
              Automated analysis of wait-times, abandonment, agent behavior, volume patterns, and repeat contacts.
              Baselines use all data; recent periods compared against baseline. Click any card for details.
            </Text>
          </div>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Paper p="md" radius="md" withBorder ta="center">
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Critical</Text>
            <Text fw={700} size="xl" c="red">{criticalCount}</Text>
          </Paper>
          <Paper p="md" radius="md" withBorder ta="center">
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Warning</Text>
            <Text fw={700} size="xl" c="orange">{warningCount}</Text>
          </Paper>
          <Paper p="md" radius="md" withBorder ta="center">
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Info</Text>
            <Text fw={700} size="xl" c="yellow">{infoCount}</Text>
          </Paper>
        </SimpleGrid>

        {anomalies.length === 0 ? (
          <Paper p="xl" radius="md" withBorder ta="center">
            <Text c="dimmed">No anomalies detected. Data looks healthy!</Text>
          </Paper>
        ) : (
          Object.entries(byCategory).map(([category, items]) => {
            const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['wait-time']
            const CatIcon = config.icon
            return (
              <div key={category}>
                <Group gap="xs" mb="xs">
                  <CatIcon size={16} style={{ color: `var(--mantine-color-${config.color}-6)` }} />
                  <Text fw={600} size="sm">{config.label}</Text>
                  <Badge variant="light" color={config.color} size="xs" radius="sm">
                    {items.length}
                  </Badge>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  {items.slice(0, 10).map(item => (
                    <AnomalyCard key={item.id} item={item} onClick={() => setSelected(item)} />
                  ))}
                </SimpleGrid>
                {items.length > 10 && (
                  <Text size="xs" c="dimmed" ta="center" mt="sm">
                    +{items.length - 10} more {config.label.toLowerCase()} anomalies
                  </Text>
                )}
              </div>
            )
          })
        )}
      </Stack>

      <AnomalyModal
        item={selected}
        opened={selected !== null}
        onClose={() => setSelected(null)}
      />
    </motion.div>
  )
}