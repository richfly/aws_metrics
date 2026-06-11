import { useMemo, useState } from 'react'
import { Paper, Text, Group, Tooltip, SegmentedControl, SimpleGrid, Stack, Table } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { ContactRecord } from '../types'
import { calculateDailySla, calculateOverallSla, calculateSlaByShift } from '../utils/metricsCalculator'

interface SlaAnalysisProps {
  records: ContactRecord[]
}

const SHIFT_COLORS: Record<string, string> = {
  "1st": "var(--mantine-color-blue-5)",
  "2nd": "var(--mantine-color-teal-5)",
  "3rd": "var(--mantine-color-violet-5)",
}

const SHIFT_LABELS: Record<string, string> = {
  "1st": "1st (6:00–13:59)",
  "2nd": "2nd (14:00–21:59)",
  "3rd": "3rd (22:00–5:59)",
}

type SlaField = "pct30s" | "pct60s" | "pct120s" | "qPct30s" | "qPct60s" | "qPct120s"

function aggregateByWeek(rows: ReturnType<typeof calculateDailySla>) {
  const map = new Map<string, {
    weekStart: string
    shift: string
    total: number
    below30s: number
    below60s: number
    below120s: number
    qBelow30s: number
    qBelow60s: number
    qBelow120s: number
  }>()

  for (const r of rows) {
    const key = `${r.weekStart}|${r.shift}`
    let g = map.get(key)
    if (!g) {
      g = { weekStart: r.weekStart, shift: r.shift, total: 0, below30s: 0, below60s: 0, below120s: 0, qBelow30s: 0, qBelow60s: 0, qBelow120s: 0 }
      map.set(key, g)
    }
    g.total += r.total
    g.below30s += r.below30s
    g.below60s += r.below60s
    g.below120s += r.below120s
    g.qBelow30s += r.qBelow30s
    g.qBelow60s += r.qBelow60s
    g.qBelow120s += r.qBelow120s
  }

  return [...map.values()]
    .map((g) => ({
      date: g.weekStart,
      weekStart: g.weekStart,
      shift: g.shift,
      total: g.total,
      below30s: g.below30s,
      below60s: g.below60s,
      below120s: g.below120s,
      pct30s: (g.below30s / g.total) * 100,
      pct60s: (g.below60s / g.total) * 100,
      pct120s: (g.below120s / g.total) * 100,
      qBelow30s: g.qBelow30s,
      qBelow60s: g.qBelow60s,
      qBelow120s: g.qBelow120s,
      qPct30s: (g.qBelow30s / g.total) * 100,
      qPct60s: (g.qBelow60s / g.total) * 100,
      qPct120s: (g.qBelow120s / g.total) * 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function getFieldValue(row: ReturnType<typeof calculateDailySla>[number], field: SlaField): number {
  return row[field]
}

function buildChartData(
  rows: ReturnType<typeof calculateDailySla>,
  field: SlaField,
  groupByWeek: boolean,
) {
  const grouped = groupByWeek ? aggregateByWeek(rows) : rows
  const dates = [...new Set(grouped.map((r: any) => r.date))].sort()
  return dates.map((date) => {
    const row: Record<string, number | string> = { date }
    for (const s of ["1st", "2nd", "3rd"]) {
      const found = grouped.find((r: any) => r.date === date && r.shift === s)
      row[s] = found ? Math.round(getFieldValue(found, field) * 10) / 10 : 0
    }
    return row
  })
}

function buildVolumeData(
  rows: ReturnType<typeof calculateDailySla>,
  groupByWeek: boolean,
) {
  const grouped = groupByWeek ? aggregateByWeek(rows) : rows
  const dates = [...new Set(grouped.map((r: any) => r.date))].sort()
  return dates.map((date) => {
    const row: Record<string, number | string> = { date }
    for (const s of ["1st", "2nd", "3rd"]) {
      const found = grouped.find((r: any) => r.date === date && r.shift === s)
      row[s] = found ? found.total : 0
    }
    return row
  })
}

function formatDateLabel(dateStr: string) {
  const parts = dateStr.split("-")
  return `${parts[1]}/${parts[2]}`
}

function labelFormatter(label: any) {
  const parts = label.split("-")
  return `${parts[1]}/${parts[2]}/${parts[0]}`
}

const connectSpecs = [
  { key: "pct30s" as SlaField, title: "≤ 30 seconds", subtitle: "% of contacts connected to agent within 30 seconds" },
  { key: "pct60s" as SlaField, title: "≤ 60 seconds", subtitle: "% of contacts connected to agent within 60 seconds" },
  { key: "pct120s" as SlaField, title: "≤ 120 seconds", subtitle: "% of contacts connected to agent within 120 seconds" },
]

const queueSpecs = [
  { key: "qPct30s" as SlaField, title: "≤ 30 seconds", subtitle: "% answered within 30s from enqueue (excludes IVR)" },
  { key: "qPct60s" as SlaField, title: "≤ 60 seconds", subtitle: "% answered within 60s from enqueue (excludes IVR)" },
  { key: "qPct120s" as SlaField, title: "≤ 120 seconds", subtitle: "% answered within 120s from enqueue (excludes IVR)" },
]

export function SlaAnalysis({ records }: SlaAnalysisProps) {
  const [groupByWeek, setGroupByWeek] = useState(false)
  const slaRows = useMemo(() => calculateDailySla(records), [records])
  const overall = useMemo(() => calculateOverallSla(records), [records])
  const hasData = slaRows.length > 0

  const connectChartData = useMemo(
    () => connectSpecs.map((spec) => ({
      ...spec,
      chartData: buildChartData(slaRows, spec.key, groupByWeek),
    })),
    [slaRows, groupByWeek],
  )

  const queueChartData = useMemo(
    () => queueSpecs.map((spec) => ({
      ...spec,
      chartData: buildChartData(slaRows, spec.key, groupByWeek),
    })),
    [slaRows, groupByWeek],
  )

  const volumeData = useMemo(() => buildVolumeData(slaRows, groupByWeek), [slaRows, groupByWeek])

  const shiftData = useMemo(() => calculateSlaByShift(records), [records])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Paper shadow="sm" radius="md" p="md" className="glass-panel">
        <Group justify="space-between" mb="md">
          <div>
            <Group gap="xs">
              <Text fw={600} size="lg">SLA Analysis</Text>
              <Tooltip
                label={
                  <div>
                    <Text size="xs">1st Shift: 6:00 – 13:59</Text>
                    <Text size="xs">2nd Shift: 14:00 – 21:59</Text>
                    <Text size="xs">3rd Shift: 22:00 – 5:59</Text>
                  </div>
                }
                multiline
                w={180}
                withArrow
              >
                <IconInfoCircle size={16} style={{ opacity: 0.4, cursor: "help" }} />
              </Tooltip>
            </Group>
            <Text size="xs" c="dimmed">
              Agent Connect Time attainment by day and shift
            </Text>
          </div>
          <SegmentedControl
            value={groupByWeek ? "week" : "day"}
            onChange={(v) => setGroupByWeek(v === "week")}
            data={[
              { value: "day", label: "Daily" },
              { value: "week", label: "Weekly" },
            ]}
            size="xs"
          />
        </Group>

        {!hasData && (
          <Text c="dimmed" ta="center" py="xl">
            No SLA data available for the current filter selection
          </Text>
        )}

        {hasData && (
          <Stack gap="xl">
            {/* Overall summary cards */}
            <SimpleGrid cols={{ base: 1, sm: 4 }}>
              <Paper p="md" radius="md" className="glass-panel" ta="center">
                <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Contacts Handled</Text>
                <Text fw={700} size="xl">{overall.total.toLocaleString()}</Text>
              </Paper>
              <Paper p="md" radius="md" className="glass-panel" ta="center">
                <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Overall ≤ 30s</Text>
                <Text fw={700} size="xl">{overall.pct30s.toFixed(1)}%</Text>
              </Paper>
              <Paper p="md" radius="md" className="glass-panel" ta="center">
                <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Overall ≤ 60s</Text>
                <Text fw={700} size="xl">{overall.pct60s.toFixed(1)}%</Text>
              </Paper>
              <Paper p="md" radius="md" className="glass-panel" ta="center">
                <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Overall ≤ 120s</Text>
                <Text fw={700} size="xl">{overall.pct120s.toFixed(1)}%</Text>
              </Paper>
            </SimpleGrid>

            {/* Shift summary table */}
            {shiftData.length > 0 && (
              <Paper p="md" radius="md" withBorder>
                <Text fw={600} size="sm" mb="xs">SLA by Shift</Text>
                <Text size="xs" c="dimmed" mb="sm">Aggregated across the selected period</Text>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Shift</Table.Th>
                      <Table.Th ta="right">Contacts Handled</Table.Th>
                      <Table.Th ta="right">Avg ≤ 30s</Table.Th>
                      <Table.Th ta="right">Avg ≤ 60s</Table.Th>
                      <Table.Th ta="right">Avg ≤ 120s</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {shiftData.map((row) => (
                      <Table.Tr key={row.shift}>
                        <Table.Td fw={500}>{row.shift} Shift</Table.Td>
                        <Table.Td ta="right">{row.total.toLocaleString()}</Table.Td>
                        <Table.Td ta="right">{row.pct30s.toFixed(1)}%</Table.Td>
                        <Table.Td ta="right">{row.pct60s.toFixed(1)}%</Table.Td>
                        <Table.Td ta="right">{row.pct120s.toFixed(1)}%</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}

            {/* Agent Connect Time SLA */}
            <Paper p="md" radius="md" withBorder>
              <Text fw={600} size="sm" mb="xs">Agent Connect Time SLA</Text>
              <Text size="xs" c="dimmed" mb="md">Initiation timestamp → Connected to agent timestamp</Text>
              <Stack gap="xl">
                {connectChartData.map((spec) => (
                  <div key={spec.key}>
                    <Text fw={500} size="xs" mb={4}>{spec.title}</Text>
                    <Text size="xs" c="dimmed" mb="xs">{spec.subtitle}</Text>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={spec.chartData} margin={{ left: -8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-3)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: any) => formatDateLabel(String(v))}
                        />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                        <RechartsTooltip
                          formatter={(value: any) => [`${Number(value).toFixed(1)}%`]}
                          labelFormatter={labelFormatter}
                        />
                        <ReferenceLine y={90} stroke="var(--mantine-color-red-6)" strokeDasharray="6 3" label={{ value: "90%", position: "right", fontSize: 11 }} />
                        <Legend
                          formatter={(value: string) => (
                            <span style={{ fontSize: 12 }}>{SHIFT_LABELS[value] || value}</span>
                          )}
                        />
                        {["1st", "2nd", "3rd"].map((shift) => (
                          <Bar
                            key={shift}
                            dataKey={shift}
                            name={shift}
                            fill={SHIFT_COLORS[shift]}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={24}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </Stack>
            </Paper>

            {/* Queue Time SLA */}
            <Paper p="md" radius="md" withBorder>
              <Text fw={600} size="sm" mb="xs">Queue Time SLA</Text>
              <Text size="xs" c="dimmed" mb="md">Enqueue timestamp → Connected to agent timestamp (excludes IVR time)</Text>
              <Stack gap="xl">
                {queueChartData.map((spec) => (
                  <div key={spec.key}>
                    <Text fw={500} size="xs" mb={4}>{spec.title}</Text>
                    <Text size="xs" c="dimmed" mb="xs">{spec.subtitle}</Text>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={spec.chartData} margin={{ left: -8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-3)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: any) => formatDateLabel(String(v))}
                        />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                        <RechartsTooltip
                          formatter={(value: any) => [`${Number(value).toFixed(1)}%`]}
                          labelFormatter={labelFormatter}
                        />
                        <ReferenceLine y={90} stroke="var(--mantine-color-red-6)" strokeDasharray="6 3" label={{ value: "90%", position: "right", fontSize: 11 }} />
                        <Legend
                          formatter={(value: string) => (
                            <span style={{ fontSize: 12 }}>{SHIFT_LABELS[value] || value}</span>
                          )}
                        />
                        {["1st", "2nd", "3rd"].map((shift) => (
                          <Bar
                            key={shift}
                            dataKey={shift}
                            name={shift}
                            fill={SHIFT_COLORS[shift]}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={24}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </Stack>
            </Paper>

            {/* Contact Volume by Shift */}
            <Paper p="md" radius="md" withBorder>
              <Text fw={600} size="sm" mb="xs">Contact Volume by Shift</Text>
              <Text size="xs" c="dimmed" mb="md">Number of contacts handled per day by shift</Text>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={volumeData} margin={{ left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-3)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: any) => formatDateLabel(String(v))}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(value: any) => [Number(value).toLocaleString()]}
                    labelFormatter={labelFormatter}
                  />
                  <Legend
                    formatter={(value: string) => (
                      <span style={{ fontSize: 12 }}>{SHIFT_LABELS[value] || value}</span>
                    )}
                  />
                  {["1st", "2nd", "3rd"].map((shift) => (
                    <Bar
                      key={shift}
                      dataKey={shift}
                      name={shift}
                      fill={SHIFT_COLORS[shift]}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Stack>
        )}
      </Paper>
    </motion.div>
  )
}
