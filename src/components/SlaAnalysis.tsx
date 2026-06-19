import { useMemo, useState, useRef } from 'react'
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
import { ChartExportButton } from './ChartExportButton'
import {
  SHIFT_COLORS,
  SHIFT_LABELS,
  SHIFTS,
  formatDateLabel,
  labelFormatter,
  buildChartData,
  buildVolumeData,
} from '../utils/slaChartUtils'

interface SlaAnalysisProps {
  records: ContactRecord[]
}

type SlaField = "pct20s" | "pct60s" | "pct120s"

const CURSOR_STROKE = {
  strokeDasharray: "3 3",
  stroke: "var(--mantine-color-gray-5)",
  strokeWidth: 1,
}

const connectSpecs = [
  { key: "pct20s" as SlaField, title: "≤ 20 seconds", subtitle: "% of contacts connected to agent within 20 seconds" },
  { key: "pct60s" as SlaField, title: "≤ 60 seconds", subtitle: "% of contacts connected to agent within 60 seconds" },
  { key: "pct120s" as SlaField, title: "≤ 120 seconds", subtitle: "% of contacts connected to agent within 120 seconds" },
]



export function SlaAnalysis({ records }: SlaAnalysisProps) {
  const [groupByWeek, setGroupByWeek] = useState(false)
  const connectChartRef = useRef<HTMLDivElement>(null)
  const volumeChartRef = useRef<HTMLDivElement>(null)
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
                <IconInfoCircle size={16} color="var(--mantine-color-dimmed)" style={{ cursor: "help" }} />
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
                <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Overall ≤ 20s</Text>
                <Text fw={700} size="xl">{overall.pct20s.toFixed(1)}%</Text>
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
                      <Table.Th ta="right">Avg ≤ 20s</Table.Th>
                      <Table.Th ta="right">Avg ≤ 60s</Table.Th>
                      <Table.Th ta="right">Avg ≤ 120s</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {shiftData.map((row) => (
                      <Table.Tr key={row.shift}>
                        <Table.Td fw={500}>{row.shift} Shift</Table.Td>
                        <Table.Td ta="right">{row.total.toLocaleString()}</Table.Td>
                        <Table.Td ta="right">{row.pct20s.toFixed(1)}%</Table.Td>
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
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">Agent Connect Time SLA</Text>
                <ChartExportButton targetRef={connectChartRef} filename="agent-connect-sla" />
              </Group>
              <Text size="xs" c="dimmed" mb="md">Initiation timestamp → Connected to agent timestamp</Text>
              <div ref={connectChartRef}>
                <Stack gap="xl">
                  {connectChartData.map((spec) => (
                    <div key={spec.key}>
                      <Text fw={500} size="xs" mb={4}>{spec.title}</Text>
                      <Text size="xs" c="dimmed" mb="xs">{spec.subtitle}</Text>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={spec.chartData} margin={{ left: -8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-5)" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v: any) => formatDateLabel(String(v))}
                          />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                          <RechartsTooltip
                            cursor={CURSOR_STROKE}
                            formatter={(value: any) => [`${Number(value).toFixed(1)}%`]}
                            labelFormatter={labelFormatter}
                          />
                          <ReferenceLine y={90} stroke="var(--mantine-color-red-6)" strokeDasharray="6 3" label={{ value: "90%", position: "right", fontSize: 11 }} />
                          <Legend
                            formatter={(value: string) => (
                              <span style={{ fontSize: 12 }}>{SHIFT_LABELS[value] || value}</span>
                            )}
                          />
                          {SHIFTS.map((shift) => (
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
              </div>
            </Paper>

            {/* Contact Volume by Shift */}
            <Paper p="md" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">Contact Volume by Shift</Text>
                <ChartExportButton targetRef={volumeChartRef} filename="contact-volume-by-shift" />
              </Group>
              <Text size="xs" c="dimmed" mb="md">Number of contacts handled per day by shift</Text>
              <div ref={volumeChartRef}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={volumeData} margin={{ left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-5)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: any) => formatDateLabel(String(v))}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      cursor={CURSOR_STROKE}
                      formatter={(value: any) => [Number(value).toLocaleString()]}
                      labelFormatter={labelFormatter}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span style={{ fontSize: 12 }}>{SHIFT_LABELS[value] || value}</span>
                      )}
                    />
                    {SHIFTS.map((shift) => (
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
            </Paper>
          </Stack>
        )}
      </Paper>
    </motion.div>
  )
}
