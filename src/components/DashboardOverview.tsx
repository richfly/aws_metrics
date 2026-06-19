import { useMemo, useRef } from 'react'
import { Paper, Text, Group, SimpleGrid, Stack, Tooltip, ScrollArea, useMantineColorScheme } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from 'recharts'
import { ContactRecord } from '../types'
import { calculateOverallSla, calculateDailySla, parseDate, localDateStr } from '../utils/metricsCalculator'
import { ChartExportButton } from './ChartExportButton'

interface DashboardOverviewProps {
  records: ContactRecord[]
}

const CURSOR_STROKE = {
  strokeDasharray: "3 3",
  stroke: "var(--mantine-color-gray-5)",
  strokeWidth: 1,
}

function formatDate(str: string): string {
  const parts = str.split("-")
  return `${parts[1]}/${parts[2]}`
}

function computeRollingAvg(data: { date: string; value: number }[], window = 7): { date: string; value: number; trend: number | null }[] {
  return data.map((d, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = data.slice(start, i + 1)
    const avg = slice.reduce((s, x) => s + x.value, 0) / slice.length
    return { date: d.date, value: d.value, trend: i >= window - 1 ? Math.round(avg * 10) / 10 : null }
  })
}

export function DashboardOverview({ records }: DashboardOverviewProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const volumeChartRef = useRef<HTMLDivElement>(null)
  const slaChartRef = useRef<HTMLDivElement>(null)

  const total = records.length

  const overallSla = useMemo(() => calculateOverallSla(records), [records])

  const abandonedCount = useMemo(
    () => records.filter(r => !r.connectedToAgentTimestamp).length,
    [records],
  )
  const abandonmentRate = total > 0 ? (abandonedCount / total) * 100 : 0

  const connectSecs = useMemo(() => {
    const times: number[] = []
    for (const r of records) {
      const d1 = parseDate(r.initiationTimestamp)
      const d2 = parseDate(r.connectedToAgentTimestamp)
      if (!d1 || !d2) continue
      times.push((d2.getTime() - d1.getTime()) / 1000)
    }
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null
  }, [records])

  const slaRate = overallSla.total > 0 ? overallSla.pct60s : 0
  const slaColor = slaRate >= 90 ? "teal" : slaRate >= 80 ? "yellow" : "red"
  const abandonColor = abandonmentRate < 10 ? "teal" : abandonmentRate < 20 ? "yellow" : "red"

  const dailyVolume = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of records) {
      const d = parseDate(r.initiationTimestamp)
      if (!d) continue
      const dateStr = localDateStr(d)
      map.set(dateStr, (map.get(dateStr) || 0) + 1)
    }
    return Array.from(map.entries())
      .map(([date, count]) => ({ date: formatDate(date), count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [records])

  const slaDailyRaw = useMemo(() => {
    const rows = calculateDailySla(records)
    const map = new Map<string, { total: number; met: number }>()
    for (const r of rows) {
      const g = map.get(r.date) || { total: 0, met: 0 }
      g.total += r.total
      g.met += r.below60s
      map.set(r.date, g)
    }
    return Array.from(map.entries())
      .map(([date, g]) => ({
        date: formatDate(date),
        pct: g.total > 0 ? (g.met / g.total) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [records])

  const slaDailyData = useMemo(
    () => computeRollingAvg(slaDailyRaw.map(d => ({ date: d.date, value: d.pct })), 7),
    [slaDailyRaw],
  )

  const slaDelta = useMemo(() => {
    const len = slaDailyRaw.length
    if (len < 14) return null
    const recent = slaDailyRaw.slice(-7)
    const prior = slaDailyRaw.slice(-14, -7)
    const recentAvg = recent.reduce((s, d) => s + d.pct, 0) / recent.length
    const priorAvg = prior.reduce((s, d) => s + d.pct, 0) / prior.length
    const delta = recentAvg - priorAvg
    return { recentAvg, priorAvg, delta }
  }, [slaDailyRaw])

  const volumeDelta = useMemo(() => {
    const len = dailyVolume.length
    if (len < 14) return null
    const recent = dailyVolume.slice(-7)
    const prior = dailyVolume.slice(-14, -7)
    const recentAvg = recent.reduce((s, d) => s + d.count, 0) / recent.length
    const priorAvg = prior.reduce((s, d) => s + d.count, 0) / prior.length
    const delta = recentAvg - priorAvg
    return { recentAvg, priorAvg, delta }
  }, [dailyVolume])

  const heatmapRef = useRef<HTMLDivElement>(null)

  const dayHourData = useMemo(() => {
    const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const map = new Map<string, { total: number; abandoned: number }>()
    for (const r of records) {
      const d = parseDate(r.initiationTimestamp)
      if (!d) continue
      const dow = (d.getDay() + 6) % 7
      const hour = d.getHours()
      const key = `${dow}-${hour}`
      const cell = map.get(key) || { total: 0, abandoned: 0 }
      cell.total++
      if (!r.connectedToAgentTimestamp) cell.abandoned++
      map.set(key, cell)
    }
    const maxTotal = Math.max(...Array.from(map.values()).map(v => v.total), 1)
    const cells: { dow: number; hour: number; total: number; abandoned: number; abandonRate: number; intensity: number }[] = []
    for (let dow = 0; dow < 7; dow++) {
      for (let hour = 0; hour < 24; hour++) {
        const cell = map.get(`${dow}-${hour}`) || { total: 0, abandoned: 0 }
        const abandonRate = cell.total > 0 ? (cell.abandoned / cell.total) * 100 : 0
        const intensity = cell.total / maxTotal
        cells.push({ dow, hour, total: cell.total, abandoned: cell.abandoned, abandonRate, intensity })
      }
    }
    return { cells, maxTotal, DAY_NAMES }
  }, [records])

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
        <Stack gap="xl">
          <SimpleGrid cols={{ base: 1, sm: 4 }}>
            <Paper p="md" radius="md" className="glass-panel" ta="center">
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                Contacts
              </Text>
              <Text fw={700} size="xl">
                {overallSla.total.toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                Handled{volumeDelta ? ` · ${volumeDelta.delta >= 0 ? "↑" : "↓"} ${Math.abs(volumeDelta.delta).toFixed(0)}/day vs prior week` : ""}
              </Text>
            </Paper>

            <Paper p="md" radius="md" className="glass-panel" ta="center">
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                Service Level ≤60s
              </Text>
              <Text fw={700} size="xl" c={slaColor}>
                {slaRate.toFixed(1)}%
              </Text>
              <Text size="xs" c="dimmed">
                {slaDelta
                  ? `${slaDelta.delta >= 0 ? "↑" : "↓"} ${Math.abs(slaDelta.delta).toFixed(1)} pts vs prior week`
                  : slaRate >= 90
                  ? "At target"
                  : slaRate >= 80
                  ? "Near target"
                  : "Below target"}
              </Text>
            </Paper>

            <Paper p="md" radius="md" className="glass-panel" ta="center">
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                Abandonment Rate
              </Text>
              <Text fw={700} size="xl" c={abandonColor}>
                {abandonmentRate.toFixed(1)}%
              </Text>
              <Text size="xs" c="dimmed">
                {abandonedCount.toLocaleString()} contacts
              </Text>
            </Paper>

            <Paper p="md" radius="md" className="glass-panel" ta="center">
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                Avg Speed to Answer
              </Text>
              <Text fw={700} size="xl">
                {connectSecs !== null ? `${connectSecs.toFixed(0)}s` : '—'}
              </Text>
              <Text size="xs" c="dimmed">Connect time</Text>
            </Paper>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Paper p="md" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Text fw={600} size="sm">Contact Volume</Text>
                <Tooltip label="All contacts per day including abandoned" multiline w={200} withArrow>
                  <IconInfoCircle size={14} color="var(--mantine-color-dimmed)" style={{ cursor: "help" }} />
                </Tooltip>
                </Group>
                <ChartExportButton targetRef={volumeChartRef} filename="contact-volume" />
              </Group>
              <Text size="xs" c="dimmed" mb="md">Daily contact volume</Text>
              <div ref={volumeChartRef}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dailyVolume} margin={{ left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-5)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      cursor={CURSOR_STROKE}
                      formatter={(value: any) => [Number(value).toLocaleString(), "Contacts"]}
                    />
                    <Bar dataKey="count" fill="var(--mantine-color-blue-5)" radius={[4, 4, 0, 0]} maxBarSize={32} name="Contacts" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Paper>

            <Paper p="md" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Text fw={600} size="sm">Service Level Trend</Text>
                  <Tooltip label="% of contacts answered within 60 seconds per day, with 7-day rolling average." multiline w={280} withArrow>
                  <IconInfoCircle size={14} color="var(--mantine-color-dimmed)" style={{ cursor: "help" }} />
                </Tooltip>
                </Group>
                <ChartExportButton targetRef={slaChartRef} filename="service-level-trend" />
              </Group>
              <Text size="xs" c="dimmed" mb="md">≤60s daily with 7-day rolling average</Text>
              <div ref={slaChartRef}>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={slaDailyData} margin={{ left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-5)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                    <RechartsTooltip
                      cursor={CURSOR_STROKE}
                      formatter={(value: any, name: any) => [
                        `${Number(value).toFixed(1)}%`,
                        name === "pct" ? "≤60s" : "7-day avg",
                      ]}
                    />
                    <ReferenceLine y={90} stroke="var(--mantine-color-red-6)" strokeDasharray="6 3" label={{ value: "90%", position: "right", fontSize: 11 }} />
                    <Bar dataKey="pct" fill="var(--mantine-color-teal-5)" radius={[4, 4, 0, 0]} maxBarSize={32} name="≤60s" />
                    <Line type="monotone" dataKey="trend" stroke="var(--mantine-color-text)" strokeWidth={2} dot={false} name="7-day avg" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Paper>
          </SimpleGrid>

          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <Text fw={600} size="sm">Volume by Hour & Day</Text>
                <Tooltip label="Contact volume by day and hour. Cell color = volume intensity. Red text = abandonment rate ≥ 25%." multiline w={280} withArrow>
                  <IconInfoCircle size={14} color="var(--mantine-color-dimmed)" style={{ cursor: "help" }} />
                </Tooltip>
              </Group>
              <ChartExportButton targetRef={heatmapRef} filename="volume-heatmap" />
            </Group>
            <div ref={heatmapRef}>
              <ScrollArea>
                <div style={{ minWidth: 820 }}>
                  <div style={{ display: "grid", gridTemplateColumns: `48px repeat(24, 1fr)`, gap: 0 }}>
                    <div />
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} style={{ textAlign: "center", fontSize: 10, color: "var(--mantine-color-dimmed)", padding: "2px 0" }}>
                        {h}
                      </div>
                    ))}
                  </div>
                  {dayHourData.DAY_NAMES.map((day, dow) => (
                    <div key={dow} style={{ display: "grid", gridTemplateColumns: `48px repeat(24, 1fr)`, gap: 0 }}>
                      <div style={{ fontSize: 11, color: "var(--mantine-color-dimmed)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
                        {day}
                      </div>
                      {Array.from({ length: 24 }, (_, hour) => {
                        const cell = dayHourData.cells.find(c => c.dow === dow && c.hour === hour)
                        if (!cell || cell.total === 0) {
                          return (
                            <div key={hour} style={{
                              background: isDark ? "var(--mantine-color-dark-8)" : "var(--mantine-color-gray-1)",
                              height: 28,
                              border: isDark ? "1px solid var(--mantine-color-dark-6)" : "1px solid var(--mantine-color-gray-3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 9,
                              color: "var(--mantine-color-dimmed)",
                            }}>
                              —
                            </div>
                          )
                        }
                        const blueShade = Math.min(Math.ceil(cell.intensity * 8), 8)
                        const bgColor = `var(--mantine-color-blue-${blueShade})`
                        const textColor = blueShade >= 5 ? "var(--mantine-color-white)" : "var(--mantine-color-text)"
                        const isHighAbandon = cell.abandonRate >= 25
                        return (
                          <Tooltip
                            key={hour}
                            label={`${day} ${hour}:00 — ${cell.total} contacts, ${cell.abandonRate.toFixed(0)}% abandoned`}
                            withArrow
                            multiline
                            w={200}
                          >
                            <div style={{
                              background: bgColor,
                              height: 28,
                              border: isDark ? "1px solid var(--mantine-color-dark-6)" : "1px solid var(--mantine-color-gray-3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 9,
                              fontWeight: 600,
                              color: isHighAbandon ? "var(--mantine-color-red-4)" : textColor,
                              cursor: "default",
                            }}>
                              {cell.total}
                            </div>
                          </Tooltip>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </Paper>
        </Stack>
      </Paper>
    </motion.div>
  )
}
