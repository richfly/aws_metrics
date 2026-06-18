import { useMemo, useRef } from 'react'
import { Paper, Text, Group, SimpleGrid, Stack, Table, ScrollArea } from '@mantine/core'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Brush,
} from 'recharts'
import { ContactRecord } from '../types'
import { parseDate, getShift } from '../utils/metricsCalculator'
import { ChartExportButton } from './ChartExportButton'

interface AbandonmentAnalysisProps {
  records: ContactRecord[]
}

function formatDate(str: string): string {
  const d = parseDate(str)
  if (!d) return str
  const parts = str.split("-")
  return `${parts[1]}/${parts[2]}`
}

const CURSOR_STROKE = {
  strokeDasharray: "3 3",
  stroke: "var(--mantine-color-gray-5)",
  strokeWidth: 1,
}

export function AbandonmentAnalysis({ records }: AbandonmentAnalysisProps) {
  const queueChartRef = useRef<HTMLDivElement>(null)
  const reasonChartRef = useRef<HTMLDivElement>(null)
  const shiftChartRef = useRef<HTMLDivElement>(null)
  const dailyChartRef = useRef<HTMLDivElement>(null)
  const total = records.length
  const abandoned = useMemo(() => records.filter(r => !r.connectedToAgentTimestamp), [records])
  const abandonedCount = abandoned.length
  const abandonmentRate = total > 0 ? (abandonedCount / total) * 100 : 0

  const queueData = useMemo(() => {
    const totalMap = new Map<string, number>()
    const abandonedMap = new Map<string, number>()
    for (const r of records) {
      const q = r.queue || '(empty)'
      totalMap.set(q, (totalMap.get(q) || 0) + 1)
      if (!r.connectedToAgentTimestamp)
        abandonedMap.set(q, (abandonedMap.get(q) || 0) + 1)
    }
    return Array.from(totalMap.entries())
      .map(([queue, t]) => ({
        queue,
        total: t,
        abandoned: abandonedMap.get(queue) || 0,
        rate: t > 0 ? ((abandonedMap.get(queue) || 0) / t) * 100 : 0,
      }))
      .sort((a, b) => b.abandoned - a.abandoned)
  }, [records])

  const reasonData = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of abandoned) {
      const reason = r.disconnectReason || '(none)'
      map.set(reason, (map.get(reason) || 0) + 1)
    }
    return Array.from(map.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
  }, [abandoned])

  const shiftData = useMemo(() => {
    const shifts = ["1st", "2nd", "3rd"]
    const answeredMap = new Map<string, number>()
    const abandonedMap = new Map<string, number>()
    for (const r of records) {
      const d = parseDate(r.initiationTimestamp)
      if (!d) continue
      const shift = getShift(d.getHours())
      if (r.connectedToAgentTimestamp)
        answeredMap.set(shift, (answeredMap.get(shift) || 0) + 1)
      else
        abandonedMap.set(shift, (abandonedMap.get(shift) || 0) + 1)
    }
    return shifts.map(shift => ({
      shift,
      answered: answeredMap.get(shift) || 0,
      abandoned: abandonedMap.get(shift) || 0,
    }))
  }, [records])

  const dailyData = useMemo(() => {
    const map = new Map<string, { answered: number; abandoned: number }>()
    for (const r of records) {
      const d = parseDate(r.initiationTimestamp)
      if (!d) continue
      const dateStr = d.toISOString().slice(0, 10)
      let g = map.get(dateStr)
      if (!g) {
        g = { answered: 0, abandoned: 0 }
        map.set(dateStr, g)
      }
      if (r.connectedToAgentTimestamp)
        g.answered++
      else
        g.abandoned++
    }
    return Array.from(map.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [records])

  const shiftChartData = shiftData.map(s => ({
    shift: `Shift ${s.shift}`,
    Answered: s.answered,
    Abandoned: s.abandoned,
  }))

  const dailyChartData = dailyData.map(d => ({
    date: formatDate(d.date),
    Answered: d.answered,
    Abandoned: d.abandoned,
  }))

  const chartHeight = Math.min(Math.max(queueData.length * 32, 180), 360)
  const showDailyBrush = dailyChartData.length >= 7

  if (records.length === 0) {
    return (
      <Paper shadow="sm" radius="md" p="xl" className="glass-panel">
        <Text c="dimmed" ta="center" py="xl">
          No data available. Click "Load Data" in the header to upload contact records.
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
      <Paper shadow="sm" radius="md" p="md" className="glass-panel">
        <Text fw={600} size="lg" mb={4}>Abandonment Analysis</Text>
        <Text size="xs" c="dimmed" mb="md">
          Contacts initiated but never connected to an agent
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
          <Paper p="md" radius="md" className="glass-panel" ta="center">
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Total Contacts</Text>
            <Text fw={700} size="xl">{total.toLocaleString()}</Text>
          </Paper>
          <Paper p="md" radius="md" className="glass-panel" ta="center">
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Abandoned</Text>
            <Text fw={700} size="xl" c="red">{abandonedCount.toLocaleString()}</Text>
          </Paper>
          <Paper p="md" radius="md" className="glass-panel" ta="center">
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Abandonment Rate</Text>
            <Text fw={700} size="xl" c={abandonmentRate > 20 ? "red" : "orange"}>{abandonmentRate.toFixed(1)}%</Text>
          </Paper>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm">Abandoned by Queue</Text>
              <ChartExportButton targetRef={queueChartRef} filename="abandoned-by-queue" />
            </Group>
            <Text size="xs" c="dimmed" mb="md">Top queues by abandonment count</Text>
            <div ref={queueChartRef}>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={queueData} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-5)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="queue" tick={{ fontSize: 11 }} width={160} />
                  <RechartsTooltip
                    cursor={CURSOR_STROKE}
                    formatter={(value: any, name: any) => [value, name === "abandoned" ? "Abandoned" : name]}
                  />
                  <Bar dataKey="abandoned" fill="var(--mantine-color-red-5)" radius={[0, 4, 4, 0]} name="Abandoned" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm">By Disconnect Reason</Text>
              <ChartExportButton targetRef={reasonChartRef} filename="by-disconnect-reason" />
            </Group>
            <Text size="xs" c="dimmed" mb="md">Why abandoned contacts ended</Text>
            <div ref={reasonChartRef}>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={reasonData} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-5)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="reason" tick={{ fontSize: 11 }} width={140} />
                  <RechartsTooltip cursor={CURSOR_STROKE} />
                  <Bar dataKey="count" fill="var(--mantine-color-orange-5)" radius={[0, 4, 4, 0]} name="Contacts" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Paper>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm">By Shift</Text>
              <ChartExportButton targetRef={shiftChartRef} filename="by-shift" />
            </Group>
            <Text size="xs" c="dimmed" mb="md">Answered vs abandoned by shift</Text>
            <div ref={shiftChartRef}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={shiftChartData} margin={{ left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-5)" />
                  <XAxis dataKey="shift" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip cursor={CURSOR_STROKE} />
                  <Legend />
                  <Bar dataKey="Answered" fill="var(--mantine-color-green-6)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Abandoned" fill="var(--mantine-color-red-5)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm">Daily Trend</Text>
              <ChartExportButton targetRef={dailyChartRef} filename="daily-trend" />
            </Group>
            <Text size="xs" c="dimmed" mb="md">Answered vs abandoned by day</Text>
            <div ref={dailyChartRef}>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={dailyChartData} margin={{ left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-5)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip cursor={CURSOR_STROKE} />
                  <Legend />
                  <Bar dataKey="Answered" stackId="a" fill="var(--mantine-color-green-6)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="Abandoned" stackId="a" fill="var(--mantine-color-red-5)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  {showDailyBrush && (
                    <Brush
                      dataKey="date"
                      height={28}
                      stroke="var(--mantine-color-gray-6)"
                      travellerWidth={8}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Paper>
        </SimpleGrid>

        <Paper p="md" radius="md" withBorder>
          <Group justify="space-between" mb="sm">
            <div>
              <Text fw={600} size="sm">Queue Abandonment Rates</Text>
              <Text size="xs" c="dimmed">Full breakdown across all queues</Text>
            </div>
          </Group>
          <ScrollArea style={{ maxHeight: 300 }}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Queue</Table.Th>
                  <Table.Th ta="right">Total</Table.Th>
                  <Table.Th ta="right">Abandoned</Table.Th>
                  <Table.Th ta="right">Rate</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {queueData.map((q) => (
                  <Table.Tr key={q.queue}>
                    <Table.Td fw={500}>{q.queue}</Table.Td>
                    <Table.Td ta="right">{q.total.toLocaleString()}</Table.Td>
                    <Table.Td ta="right">{q.abandoned.toLocaleString()}</Table.Td>
                    <Table.Td ta="right">{q.rate.toFixed(1)}%</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>

        <Paper p="md" radius="md" withBorder mt="md">
          <Group justify="space-between" mb="sm">
            <div>
              <Text fw={600} size="sm">Abandoned Records</Text>
              <Text size="xs" c="dimmed">
                {abandonedCount.toLocaleString()} records without agent connection
              </Text>
            </div>
          </Group>
          <ScrollArea style={{ maxHeight: 400 }}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Initiation Timestamp</Table.Th>
                  <Table.Th>Contact Duration</Table.Th>
                  <Table.Th>Queue</Table.Th>
                  <Table.Th>Disconnect Reason</Table.Th>
                  <Table.Th>Routing Profile</Table.Th>
                  <Table.Th>Initiation Method</Table.Th>
                  <Table.Th>Channel</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {abandoned.map((r) => (
                  <Table.Tr key={r.contactId}>
                    <Table.Td>{r.initiationTimestamp}</Table.Td>
                    <Table.Td>{r.contactDuration || '-'}</Table.Td>
                    <Table.Td>{r.queue || '-'}</Table.Td>
                    <Table.Td>{r.disconnectReason || '-'}</Table.Td>
                    <Table.Td>{r.routingProfile || '-'}</Table.Td>
                    <Table.Td>{r.initiationMethod || '-'}</Table.Td>
                    <Table.Td>{r.channel || '-'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      </Paper>
    </motion.div>
  )
}
