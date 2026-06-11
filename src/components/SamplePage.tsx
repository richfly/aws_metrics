import { Paper, Text, Group, Stack, Divider } from '@mantine/core'
import { motion } from 'framer-motion'
import {
  IconUpload,
  IconChartBar,
  IconPhone,
  IconChartLine,
  IconFilter,
  IconDatabase,
} from '@tabler/icons-react'

const sections = [
  {
    icon: IconDatabase,
    title: "Getting Started",
    body: "Upload two CSVs exported from Amazon Connect: Contact Search Results (contacts) and Phone Numbers. The app joins them on phone number to enrich contact records with phone descriptions.",
  },
  {
    icon: IconUpload,
    title: "Loading Data",
    body: "Click the records badge or 'Load Data' in the header. Follow the 2-step wizard: upload the Phone Numbers CSV first, then the Contact Search Results CSV.",
  },
  {
    icon: IconFilter,
    title: "Filters",
    body: "Three filters sit at the top of every page: Routing Profile, Initiation Method, and Phone Description. All charts and tables update instantly when you change a filter. Click 'Clear' to reset all filters.",
  },
]

const pages = [
  {
    icon: IconChartBar,
    title: "Dashboard",
    body: (
      <>
        <Text size="sm">Key performance metrics at a glance:</Text>
        <Text size="sm" component="ul" mt={4}>
          <li><b>Executive Summary</b> — compares filtered data against overall averages</li>
          <li><b>Big Number Cards</b> — record count and average times</li>
          <li><b>Metrics Summary</b> — avg, min, max, median, and count for each KPI</li>
          <li><b>Data Table</b> — sortable, paginated view of every record</li>
        </Text>
      </>
    ),
  },
  {
    icon: IconPhone,
    title: "Phone Analysis",
    body: "Breaks down average Agent Connect Time, Handle Time, and ACW Time by phone description. Useful for identifying which phone lines perform best or worst.",
  },
  {
    icon: IconChartLine,
    title: "SLA Analysis",
    body: (
      <>
        <Text size="sm">Tracks Agent Connect Time attainment by day and shift:</Text>
        <Text size="sm" component="ul" mt={4}>
          <li><b>≤ 30 seconds</b> — % of contacts connected within 30s</li>
          <li><b>≤ 60 seconds</b> — % of contacts connected within 60s</li>
          <li><b>≤ 120 seconds</b> — % of contacts connected within 120s</li>
        </Text>
        <Text size="sm" mt={4}>Each chart shows a grouped bar per day, split by shift (1st: 6–14, 2nd: 14–22, 3rd: 22–6).</Text>
      </>
    ),
  },
]

const measures = [
  {
    label: "Agent Connect Time",
    def: "Time from initiation to agent connection. Connect = connectedToAgentTimestamp − initiationTimestamp.",
    unit: "minutes (or seconds in SLA)",
  },
  {
    label: "Handle Time",
    def: "Total contact duration from initiation to disconnect. Handle = disconnectTimestamp − initiationTimestamp.",
    unit: "minutes",
  },
  {
    label: "After ACW Time",
    def: "Time spent in after-contact work. ACW = acwEndTimestamp − acwStartTimestamp.",
    unit: "minutes",
  },
  {
    label: "SLA Attainment",
    def: "Percentage of contacts connected to an agent within a given threshold (30s, 60s, or 120s). Calculated per day and shift.",
    unit: "%",
  },
]

export function SamplePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Paper shadow="sm" radius="md" p="md" className="glass-panel">
        <Text fw={600} size="lg" mb="md">Usage & Definitions</Text>

        <Stack gap="lg">
          <div>
            <Text fw={600} size="sm" mb="xs" c="dimmed">HOW IT WORKS</Text>
            <Divider mb="sm" />
            <Stack gap="md">
              {sections.map(({ icon: Icon, title, body }) => (
                <Group key={title} gap="sm" align="flex-start">
                  <Icon size={20} style={{ marginTop: 2, flexShrink: 0, opacity: 0.5 }} />
                  <div>
                    <Text fw={600} size="sm">{title}</Text>
                    <Text size="sm" c="dimmed" lh={1.6}>{body}</Text>
                  </div>
                </Group>
              ))}
            </Stack>
          </div>

          <div>
            <Text fw={600} size="sm" mb="xs" c="dimmed">PAGES</Text>
            <Divider mb="sm" />
            <Stack gap="md">
              {pages.map(({ icon: Icon, title, body }) => (
                <Group key={title} gap="sm" align="flex-start">
                  <Icon size={20} style={{ marginTop: 2, flexShrink: 0, opacity: 0.5 }} />
                  <div>
                    <Text fw={600} size="sm">{title}</Text>
                    <div style={{ color: "var(--mantine-color-dimmed)", lineHeight: 1.6 }}>{body}</div>
                  </div>
                </Group>
              ))}
            </Stack>
          </div>

          <div>
            <Text fw={600} size="sm" mb="xs" c="dimmed">MEASURES</Text>
            <Divider mb="sm" />
            <Stack gap="md">
              {measures.map(({ label, def, unit }) => (
                <Group key={label} gap="sm" align="flex-start">
                  <div>
                    <Text fw={600} size="sm">{label}</Text>
                    <Text size="sm" c="dimmed" lh={1.6}>{def}</Text>
                    <Text size="xs" c="dimmed" mt={2}>Unit: {unit}</Text>
                  </div>
                </Group>
              ))}
            </Stack>
          </div>
        </Stack>
      </Paper>
    </motion.div>
  )
}
