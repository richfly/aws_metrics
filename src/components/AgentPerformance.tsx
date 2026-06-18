import { useMemo, useState, useRef, useDeferredValue } from 'react'
import {
  Paper,
  Text,
  Group,
  SimpleGrid,
  Stack,
  Table,
  ScrollArea,
  Pagination,
  Modal,
  Badge,
  Center,
  Box,
} from '@mantine/core'
import { motion } from 'framer-motion'
import { IconUser, IconChevronUp, IconChevronDown, IconArrowsSort } from '@tabler/icons-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { ContactRecord } from '../types'
import { calculateAgentMetrics, calculateOverallSla, parseDate, AgentMetricsRow } from '../utils/metricsCalculator'
import { ChartExportButton } from './ChartExportButton'

interface AgentPerformanceProps {
  records: ContactRecord[]
}

type SortKey = "agent" | "total" | "avgConnectSec" | "avgHandleMin" | "avgAcwMin" | "pct20s" | "pct60s" | "pct120s" | "qPct60s" | "queueCount"
type SortDir = "asc" | "desc"

const PAGE_SIZE = 20

function slaColor(value: number, threshold90: number, threshold80: number): string {
  if (value >= threshold90) return "teal"
  if (value >= threshold80) return "yellow"
  return "red"
}

function timeColor(valueSec: number, teamAvg: number): string {
  if (teamAvg === 0) return "dimmed"
  const ratio = valueSec / teamAvg
  if (ratio <= 0.9) return "teal"
  if (ratio <= 1.1) return "yellow"
  return "red"
}

function fmtSec(s: number): string {
  if (s === 0) return "—"
  if (s < 60) return `${s.toFixed(1)}s`
  return `${(s / 60).toFixed(1)}m`
}

function fmtMin(m: number): string {
  if (m === 0) return "—"
  if (m < 1) return `${(m * 60).toFixed(0)}s`
  return `${m.toFixed(1)}m`
}

function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split("-")
  return `${parts[1]}/${parts[2]}`
}

export function AgentPerformance({ records }: AgentPerformanceProps) {
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>("total")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [selectedAgent, setSelectedAgent] = useState<AgentMetricsRow | null>(null)
  const distributionChartRef = useRef<HTMLDivElement>(null)

  if (records.length === 0) {
    return (
      <Paper shadow="sm" radius="md" p="xl" className="glass-panel">
        <Text c="dimmed" ta="center" py="xl">
          No data available. Click "Load Data" in the header to upload contact records.
        </Text>
      </Paper>
    )
  }

  const agentMetrics = useMemo(() => calculateAgentMetrics(records), [records])
  const deferredAgentMetrics = useDeferredValue(agentMetrics)
  const overall = useMemo(() => calculateOverallSla(records), [records])

  const sorted = useMemo(() => {
    const out = [...deferredAgentMetrics]
    out.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let cmp: number
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv
      } else {
        cmp = String(av).localeCompare(String(bv))
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return out
  }, [deferredAgentMetrics, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const teamAvgConnect = useMemo(() => {
    if (deferredAgentMetrics.length === 0) return 0
    const all = deferredAgentMetrics.flatMap((a) => a.avgConnectSec > 0 ? [a.avgConnectSec] : [])
    return all.length > 0 ? all.reduce((s, x) => s + x, 0) / all.length : 0
  }, [deferredAgentMetrics])

  const teamAvgHandle = useMemo(() => {
    if (deferredAgentMetrics.length === 0) return 0
    const all = deferredAgentMetrics.flatMap((a) => a.avgHandleMin > 0 ? [a.avgHandleMin] : [])
    return all.length > 0 ? all.reduce((s, x) => s + x, 0) / all.length : 0
  }, [deferredAgentMetrics])

  const teamAvgSla = overall.pct60s

  const volumeLeaders = useMemo(
    () => [...deferredAgentMetrics].sort((a, b) => b.total - a.total).slice(0, 10).reverse(),
    [deferredAgentMetrics],
  )

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
    setPage(1)
  }

  const SortHeader = ({ k, label, align }: { k: SortKey; label: string; align?: "right" | "left" }) => {
    const isActive = sortKey === k
    return (
      <Table.Th ta={align ?? "right"} style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort(k)}>
        <Group gap={4} justify={align === "right" ? "flex-end" : "flex-start"} wrap="nowrap">
          <Text size="sm" fw={600}>{label}</Text>
          {isActive ? (
            sortDir === "asc" ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
          ) : (
            <IconArrowsSort size={12} style={{ opacity: 0.4 }} />
          )}
        </Group>
      </Table.Th>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Stack gap="xl">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <Paper p="md" radius="md" className="glass-panel" ta="center">
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Active Agents</Text>
            <Text fw={700} size="xl">{agentMetrics.length}</Text>
            <Text size="xs" c="dimmed">handled contacts in range</Text>
          </Paper>
          <Paper p="md" radius="md" className="glass-panel" ta="center">
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Contacts Handled</Text>
            <Text fw={700} size="xl">{records.length.toLocaleString()}</Text>
            <Text size="xs" c="dimmed">
              {agentMetrics.length > 0
                ? `~ ${Math.round(records.length / agentMetrics.length)} per agent`
                : ""}
            </Text>
          </Paper>
          <Paper p="md" radius="md" className="glass-panel" ta="center">
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Team Avg Connect Time</Text>
            <Text fw={700} size="xl">{fmtSec(teamAvgConnect)}</Text>
            <Text size="xs" c="dimmed">from initiation to agent</Text>
          </Paper>
          <Paper p="md" radius="md" className="glass-panel" ta="center">
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Team SLA ≤60s</Text>
            <Text
              fw={700}
              size="xl"
              c={slaColor(teamAvgSla, 90, 80)}
            >
              {teamAvgSla.toFixed(1)}%
            </Text>
            <Text size="xs" c="dimmed">
              {teamAvgSla >= 90 ? "At target" : teamAvgSla >= 80 ? "Near target" : "Below target"}
            </Text>
          </Paper>
        </SimpleGrid>

        <Paper p="md" radius="md" withBorder className="glass-panel">
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="sm">Agent Performance</Text>
            <Text size="xs" c="dimmed">
              Sorted by {sortKey} ({sortDir}) — click any column to re-sort
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mb="sm">
            Click an agent's name to drill into their detail. Color coding: green = at/above target, yellow = near, red = below.
          </Text>
          <ScrollArea>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <SortHeader k="agent" label="Agent" align="left" />
                  <SortHeader k="total" label="Contacts" />
                  <SortHeader k="avgConnectSec" label="Avg Connect" />
                  <SortHeader k="avgHandleMin" label="Avg Handle" />
                  <SortHeader k="avgAcwMin" label="Avg ACW" />
                  <SortHeader k="pct20s" label="SLA ≤20s" />
                  <SortHeader k="pct60s" label="SLA ≤60s" />
                  <SortHeader k="pct120s" label="SLA ≤120s" />
                  <SortHeader k="qPct60s" label="Queue ≤60s" />
                  <SortHeader k="queueCount" label="Queues" />
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pageRows.map((row) => (
                  <Table.Tr key={row.agent}>
                    <Table.Td>
                      <UnstyledButton
                        onClick={() => setSelectedAgent(row)}
                        style={{ fontWeight: 500 }}
                      >
                        <Group gap={6} wrap="nowrap">
                          <IconUser size={14} style={{ opacity: 0.6 }} />
                          <Text>{row.agent}</Text>
                        </Group>
                      </UnstyledButton>
                    </Table.Td>
                    <Table.Td ta="right">{row.total.toLocaleString()}</Table.Td>
                    <Table.Td ta="right">
                      <Text c={timeColor(row.avgConnectSec, teamAvgConnect)}>
                        {fmtSec(row.avgConnectSec)}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text c={row.avgHandleMin > teamAvgHandle * 1.2 ? "red" : row.avgHandleMin < teamAvgHandle * 0.8 ? "teal" : "dimmed"}>
                        {fmtMin(row.avgHandleMin)}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text c="dimmed">{fmtMin(row.avgAcwMin)}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Badge color={slaColor(row.pct20s, 90, 80)} variant="light" size="sm">
                        {row.pct20s.toFixed(1)}%
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Badge color={slaColor(row.pct60s, 90, 80)} variant="light" size="sm">
                        {row.pct60s.toFixed(1)}%
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Badge color={slaColor(row.pct120s, 90, 80)} variant="light" size="sm">
                        {row.pct120s.toFixed(1)}%
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" c={row.qPct60s > 0 ? slaColor(row.qPct60s, 90, 80) : "dimmed"}>
                        {row.qPct60s > 0 ? `${row.qPct60s.toFixed(1)}%` : "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" c="dimmed">{row.queueCount}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <UnstyledButton
                        size="xs"
                        variant="subtle"
                        onClick={() => setSelectedAgent(row)}
                      >
                        View
                      </UnstyledButton>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          {totalPages > 1 && (
            <Group justify="center" mt="sm">
              <Pagination total={totalPages} value={page} onChange={setPage} size="sm" withControls={false} />
              <Text size="xs" c="dimmed">
                {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, sorted.length)} of {sorted.length}
              </Text>
            </Group>
          )}
        </Paper>

        {volumeLeaders.length > 0 && (
          <Paper p="md" radius="md" withBorder className="glass-panel">
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm">Top 10 Agents by Volume</Text>
              <ChartExportButton targetRef={distributionChartRef} filename="agent-volume-leaders" />
            </Group>
            <Text size="xs" c="dimmed" mb="md">
              Contact count per agent — direct view of who's carrying the most volume.
            </Text>
            <div ref={distributionChartRef}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={volumeLeaders}
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-5)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="agent"
                    tick={{ fontSize: 11 }}
                    width={140}
                  />
                  <RechartsTooltip
                    cursor={{ strokeDasharray: "3 3", stroke: "var(--mantine-color-gray-5)", strokeWidth: 1 }}
                    formatter={(value: any) => [Number(value).toLocaleString(), "Contacts"]}
                  />
                  <Bar dataKey="total" fill="var(--mantine-color-blue-6)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Paper>
        )}
      </Stack>

      <AgentDetailModal
        agent={selectedAgent}
        allRecords={records}
        teamAvgConnect={teamAvgConnect}
        teamAvgHandle={teamAvgHandle}
        teamAvgSla60={teamAvgSla}
        onClose={() => setSelectedAgent(null)}
      />
    </motion.div>
  )
}

function UnstyledButton({
  children,
  onClick,
  style,
  size: _size,
  variant: _variant,
}: {
  children: React.ReactNode
  onClick: () => void
  style?: React.CSSProperties
  size?: string
  variant?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        color: "inherit",
        font: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  )
}

interface AgentDetailModalProps {
  agent: AgentMetricsRow | null
  allRecords: ContactRecord[]
  teamAvgConnect: number
  teamAvgHandle: number
  teamAvgSla60: number
  onClose: () => void
}

function AgentDetailModal({
  agent,
  allRecords,
  teamAvgConnect,
  teamAvgHandle,
  teamAvgSla60,
  onClose,
}: AgentDetailModalProps) {
  const detailChartRef = useRef<HTMLDivElement>(null)

  const agentRecords = useMemo(() => {
    if (!agent) return []
    return allRecords.filter((r) => r.agent?.trim() === agent.agent)
  }, [agent, allRecords])

  const dailyVolume = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of agentRecords) {
      const d = parseDate(r.initiationTimestamp)
      if (!d) continue
      const dateStr = d.toISOString().slice(0, 10)
      map.set(dateStr, (map.get(dateStr) || 0) + 1)
    }
    return Array.from(map.entries())
      .map(([date, count]) => ({ date: formatDateLabel(date), count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [agentRecords])

  const queueBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; below60s: number }>()
    for (const r of agentRecords) {
      const q = r.queue || "(empty)"
      let g = map.get(q)
      if (!g) {
        g = { total: 0, below60s: 0 }
        map.set(q, g)
      }
      g.total++
      const connectSec = parseDate(r.connectedToAgentTimestamp)
        ? (parseDate(r.connectedToAgentTimestamp)!.getTime() - parseDate(r.initiationTimestamp)!.getTime()) / 1000
        : null
      if (connectSec !== null && connectSec <= 60) g.below60s++
    }
    return Array.from(map.entries())
      .map(([queue, g]) => ({
        queue,
        total: g.total,
        pct60s: g.total > 0 ? (g.below60s / g.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [agentRecords])

  const shiftBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; below60s: number; avgConnect: number[] }>()
    for (const r of agentRecords) {
      const d = parseDate(r.initiationTimestamp)
      if (!d) continue
      const hour = d.getHours()
      const shift = hour >= 6 && hour < 14 ? "1st" : hour >= 14 && hour < 22 ? "2nd" : "3rd"
      let g = map.get(shift)
      if (!g) {
        g = { total: 0, below60s: 0, avgConnect: [] }
        map.set(shift, g)
      }
      g.total++
      const connectSec = parseDate(r.connectedToAgentTimestamp)
        ? (parseDate(r.connectedToAgentTimestamp)!.getTime() - parseDate(r.initiationTimestamp)!.getTime()) / 1000
        : null
      if (connectSec !== null) {
        g.avgConnect.push(connectSec)
        if (connectSec <= 60) g.below60s++
      }
    }
    return Array.from(map.entries()).map(([shift, g]) => ({
      shift,
      contacts: g.total,
      pct60s: g.total > 0 ? (g.below60s / g.total) * 100 : 0,
      avgConnect: g.avgConnect.length > 0
        ? g.avgConnect.reduce((a, b) => a + b, 0) / g.avgConnect.length
        : 0,
    }))
  }, [agentRecords])

  if (!agent) {
    return <Modal opened={false} onClose={onClose} />
  }

  return (
    <Modal opened={!!agent} onClose={onClose} size="xl" title={`Agent: ${agent.agent}`}>
      <Stack gap="md">
        <SimpleGrid cols={{ base: 2, md: 4 }}>
          <Paper p="sm" radius="md" className="glass-panel" ta="center">
            <Text size="xs" c="dimmed">Contacts</Text>
            <Text fw={700} size="lg">{agent.total}</Text>
          </Paper>
          <Paper p="sm" radius="md" className="glass-panel" ta="center">
            <Text size="xs" c="dimmed">Avg Connect</Text>
            <Text fw={700} size="lg" c={timeColor(agent.avgConnectSec, teamAvgConnect)}>
              {fmtSec(agent.avgConnectSec)}
            </Text>
            <Text size="xs" c="dimmed">team: {fmtSec(teamAvgConnect)}</Text>
          </Paper>
          <Paper p="sm" radius="md" className="glass-panel" ta="center">
            <Text size="xs" c="dimmed">Avg Handle</Text>
            <Text fw={700} size="lg">{fmtMin(agent.avgHandleMin)}</Text>
            <Text size="xs" c="dimmed">team: {fmtMin(teamAvgHandle)}</Text>
          </Paper>
          <Paper p="sm" radius="md" className="glass-panel" ta="center">
            <Text size="xs" c="dimmed">SLA ≤60s</Text>
            <Text fw={700} size="lg" c={slaColor(agent.pct60s, 90, 80)}>
              {agent.pct60s.toFixed(1)}%
            </Text>
            <Text size="xs" c="dimmed">team: {teamAvgSla60.toFixed(1)}%</Text>
          </Paper>
        </SimpleGrid>

        {dailyVolume.length > 0 && (
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm">Daily Volume</Text>
              <ChartExportButton targetRef={detailChartRef} filename={`agent-${agent.agent}-daily`} />
            </Group>
            <div ref={detailChartRef}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyVolume} margin={{ left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-5)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    cursor={{ strokeDasharray: "3 3", stroke: "var(--mantine-color-gray-5)", strokeWidth: 1 }}
                    formatter={(value: any) => [Number(value).toLocaleString(), "Contacts"]}
                  />
                  <Bar dataKey="count" fill="var(--mantine-color-blue-6)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Paper>
        )}

        {shiftBreakdown.length > 0 && (
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} size="sm" mb="xs">Performance by Shift</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Shift</Table.Th>
                  <Table.Th ta="right">Contacts</Table.Th>
                  <Table.Th ta="right">Avg Connect</Table.Th>
                  <Table.Th ta="right">SLA ≤60s</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {shiftBreakdown.map((s) => (
                  <Table.Tr key={s.shift}>
                    <Table.Td>{s.shift} Shift</Table.Td>
                    <Table.Td ta="right">{s.contacts}</Table.Td>
                    <Table.Td ta="right">{fmtSec(s.avgConnect)}</Table.Td>
                    <Table.Td ta="right">
                      <Badge color={slaColor(s.pct60s, 90, 80)} variant="light" size="sm">
                        {s.pct60s.toFixed(1)}%
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        {queueBreakdown.length > 0 && (
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} size="sm" mb="xs">Queue Breakdown</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Queue</Table.Th>
                  <Table.Th ta="right">Contacts</Table.Th>
                  <Table.Th ta="right">SLA ≤60s</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {queueBreakdown.slice(0, 10).map((q) => (
                  <Table.Tr key={q.queue}>
                    <Table.Td>{q.queue}</Table.Td>
                    <Table.Td ta="right">{q.total}</Table.Td>
                    <Table.Td ta="right">
                      <Badge color={slaColor(q.pct60s, 90, 80)} variant="light" size="sm">
                        {q.pct60s.toFixed(1)}%
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>
    </Modal>
  )
}
