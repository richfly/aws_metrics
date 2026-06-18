import { useMemo, useState, useRef } from 'react'
import { Paper, Text, Group, Tooltip, SegmentedControl, SimpleGrid, Stack, Table, Alert } from '@mantine/core'
import { IconInfoCircle, IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react'
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
import {
  calculateInclusiveDailySla,
  calculateInclusiveOverallSla,
  calculateInclusiveSlaByShift,
  calculateSlaComparison,
} from '../utils/metricsCalculator'
import { ChartExportButton } from './ChartExportButton'
import {
  SHIFT_COLORS,
  SHIFT_LABELS,
  SHIFTS,
  formatDateLabel,
  labelFormatter,
  buildChartData,
} from '../utils/slaChartUtils'

interface SlaInclusiveAnalysisProps {
  records: ContactRecord[]
}

type SlaField = "pct20s" | "pct60s" | "pct120s"

const connectSpecs = [
  { key: "pct20s" as SlaField, title: "≤ 20 seconds", subtitle: "% of contacts (including abandoners) ending within 20s" },
  { key: "pct60s" as SlaField, title: "≤ 60 seconds", subtitle: "% of contacts (including abandoners) ending within 60s" },
  { key: "pct120s" as SlaField, title: "≤ 120 seconds", subtitle: "% of contacts (including abandoners) ending within 120s" },
]

export function SlaInclusiveAnalysis({ records }: SlaInclusiveAnalysisProps) {
  const [groupByWeek, setGroupByWeek] = useState(false)
  const inclusiveChartRef = useRef<HTMLDivElement>(null)
  const slaRows = useMemo(() => calculateInclusiveDailySla(records), [records])
  const overall = useMemo(() => calculateInclusiveOverallSla(records), [records])
  const comparison = useMemo(() => calculateSlaComparison(records), [records])
  const hasData = slaRows.length > 0

  const abandonedCount = useMemo(
    () => records.filter((r) => !r.connectedToAgentTimestamp).length,
    [records],
  )
  const abandonedShare = records.length > 0 ? (abandonedCount / records.length) * 100 : 0

  const chartData = useMemo(
    () => connectSpecs.map((spec) => ({
      ...spec,
      chartData: buildChartData(slaRows, spec.key, groupByWeek),
    })),
    [slaRows, groupByWeek],
  )

  const shiftData = useMemo(() => calculateInclusiveSlaByShift(records), [records])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Stack gap="md">
        <Paper shadow="sm" radius="md" p="md" className="glass-panel" withBorder>
          <Group gap="sm" mb="xs">
            <Text fw={600} size="sm">What this page measures</Text>
          </Group>
          <Text size="xs" c="dimmed" lh={1.6}>
            Standard SLA only counts contacts that connected to an agent — abandoned calls are excluded entirely.
            This page includes abandoned contacts in the denominator and counts their wait time (initiation → disconnect)
            against the same 20s, 60s, and 120s thresholds. So a caller who abandons after 15s counts as having met the 20s SLA,
            while a caller who abandons after 90s failed the 20s and 60s targets. This gives a more honest view of how many
            customers were served within the target time.
          </Text>
        </Paper>

        {!hasData && (
          <Paper shadow="sm" radius="md" p="md" className="glass-panel">
            <Text c="dimmed" ta="center" py="xl">
              No SLA data available for the current filter selection
            </Text>
          </Paper>
        )}

        {hasData && (
          <Paper shadow="sm" radius="md" p="md" className="glass-panel">
            <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
              <div>
                <Group gap="xs">
                  <Text fw={600} size="lg">SLA (Inclusive of Abandonment)</Text>
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
                  Abandoned contacts are included — measured from initiation to disconnect
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

            <Stack gap="xl">
              <SimpleGrid cols={{ base: 1, sm: 4 }}>
                <Paper p="md" radius="md" className="glass-panel" ta="center">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Contacts Handled</Text>
                  <Text fw={700} size="xl">{overall.total.toLocaleString()}</Text>
                  <Text size="xs" c="dimmed">
                    including {abandonedCount.toLocaleString()} abandoned ({abandonedShare.toFixed(1)}%)
                  </Text>
                </Paper>
                <Paper p="md" radius="md" className="glass-panel" ta="center">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Inclusive ≤ 20s</Text>
                  <Text
                    fw={700}
                    size="xl"
                    c={overall.pct20s >= 90 ? "teal" : overall.pct20s >= 80 ? "yellow" : "red"}
                  >
                    {overall.pct20s.toFixed(1)}%
                  </Text>
                </Paper>
                <Paper p="md" radius="md" className="glass-panel" ta="center">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Inclusive ≤ 60s</Text>
                  <Text
                    fw={700}
                    size="xl"
                    c={overall.pct60s >= 90 ? "teal" : overall.pct60s >= 80 ? "yellow" : "red"}
                  >
                    {overall.pct60s.toFixed(1)}%
                  </Text>
                </Paper>
                <Paper p="md" radius="md" className="glass-panel" ta="center">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Inclusive ≤ 120s</Text>
                  <Text
                    fw={700}
                    size="xl"
                    c={overall.pct120s >= 90 ? "teal" : overall.pct120s >= 80 ? "yellow" : "red"}
                  >
                    {overall.pct120s.toFixed(1)}%
                  </Text>
                </Paper>
              </SimpleGrid>

              <Paper p="md" radius="md" withBorder>
                <Group gap="xs" mb="xs">
                  <Text fw={600} size="sm">Standard vs Inclusive SLA — Overall</Text>
                  <Tooltip
                    label="Standard SLA excludes abandoned contacts. Inclusive SLA counts their wait time against the threshold."
                    multiline
                    w={260}
                    withArrow
                  >
                    <IconInfoCircle size={14} color="var(--mantine-color-dimmed)" style={{ cursor: "help" }} />
                  </Tooltip>
                </Group>
                <Text size="xs" c="dimmed" mb="sm">
                  Drop in attainment = the share of contacts that abandoned before the threshold
                </Text>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Threshold</Table.Th>
                      <Table.Th ta="right">Standard SLA</Table.Th>
                      <Table.Th ta="right">Inclusive SLA</Table.Th>
                      <Table.Th ta="right">Drop</Table.Th>
                      <Table.Th ta="right">Met threshold</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {[
                      { label: "≤ 20s", std: comparison.standard.pct20s, inc: comparison.inclusive.pct20s },
                      { label: "≤ 60s", std: comparison.standard.pct60s, inc: comparison.inclusive.pct60s },
                      { label: "≤ 120s", std: comparison.standard.pct120s, inc: comparison.inclusive.pct120s },
                    ].map((row) => {
                      const drop = row.std - row.inc
                      return (
                        <Table.Tr key={row.label}>
                          <Table.Td fw={500}>{row.label}</Table.Td>
                          <Table.Td ta="right">
                            <Group gap={4} justify="flex-end" wrap="nowrap">
                              <Text>{row.std.toFixed(1)}%</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td ta="right">
                            <Text c={row.inc >= 90 ? "teal" : row.inc >= 80 ? "yellow" : "red"} fw={600}>
                              {row.inc.toFixed(1)}%
                            </Text>
                          </Table.Td>
                          <Table.Td ta="right">
                            <Text c={drop > 5 ? "red" : drop > 0 ? "orange" : "dimmed"}>
                              {drop > 0 ? "−" : ""}{drop.toFixed(1)} pts
                            </Text>
                          </Table.Td>
                          <Table.Td ta="right">
                            <Text c="dimmed" size="sm">
                              {row.inc >= row.std ? (
                                <Group gap={4} justify="flex-end" wrap="nowrap">
                                  <IconCheck size={14} color="var(--mantine-color-teal-5)" />
                                  <span>at/above</span>
                                </Group>
                              ) : (
                                <Group gap={4} justify="flex-end" wrap="nowrap">
                                  <IconX size={14} color="var(--mantine-color-red-5)" />
                                  <span>below</span>
                                </Group>
                              )}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      )
                    })}
                  </Table.Tbody>
                </Table>
              </Paper>

              {shiftData.length > 0 && (
                <Paper p="md" radius="md" withBorder>
                  <Text fw={600} size="sm" mb="xs">SLA by Shift (Inclusive)</Text>
                  <Text size="xs" c="dimmed" mb="sm">Aggregated across the selected period, with abandonment in the denominator</Text>
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

              {abandonedShare > 30 && (
                <Alert color="orange" variant="light" radius="md" icon={<IconAlertCircle size="1rem" />}>
                  <Text fw={600} size="sm">{abandonedShare.toFixed(1)}% of contacts abandoned</Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    The drop between standard and inclusive SLA is the share of contacts that gave up
                    before connecting. Investigate queues with the highest abandonment rates on the
                    Abandonment Analysis page.
                  </Text>
                </Alert>
              )}

              <Paper p="md" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Text fw={600} size="sm">Agent Connect / Abandon Time SLA (Inclusive)</Text>
                  <ChartExportButton targetRef={inclusiveChartRef} filename="inclusive-sla" />
                </Group>
                <Text size="xs" c="dimmed" mb="md">
                  Connected contacts: initiation → connected. Abandoned contacts: initiation → disconnect.
                </Text>
                <div ref={inclusiveChartRef}>
                  <Stack gap="xl">
                    {chartData.map((spec) => (
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
                              cursor={{ fill: "var(--mantine-color-teal-0)", opacity: 0.4 }}
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
            </Stack>
          </Paper>
        )}
      </Stack>
    </motion.div>
  )
}
