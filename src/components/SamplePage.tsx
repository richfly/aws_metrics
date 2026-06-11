import { Paper, Text, Group, Stack, Divider } from "@mantine/core";
import { motion } from "framer-motion";
import {
  IconUpload,
  IconChartBar,
  IconPhone,
  IconChartLine,
  IconFilter,
  IconDatabase,
  IconCalendar,
  IconExclamationCircle,
  IconClock,
} from "@tabler/icons-react";

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
    body: "Four multiselect filters sit at the top of every page: Queue, Routing Profile, Initiation Method, and Phone Description. A date range filter is also available. All charts and tables update instantly when you change a filter. Click 'Clear' to reset all filters. Filters are searchable and support multiple selections.",
  },
  {
    icon: IconClock,
    title: "Shifts",
    body: "All SLA and abandonment charts split data by shift: 1st Shift (6:00–13:59), 2nd Shift (14:00–21:59), and 3rd Shift (22:00–5:59).",
  },
];

const pages = [
  {
    icon: IconChartBar,
    title: "Dashboard",
    body: (
      <>
        <Text size="sm">Executive overview designed:</Text>
        <Text size="sm" component="ul" mt={4}>
          <li>
            <b>SLA Cards</b> — Contacts Handled, Service Level ≤60s
            (color-coded), Abandonment Rate, Avg Speed to Answer
          </li>
          <li>
            <b>Contact Volume chart</b> — daily contact count (including
            abandoned)
          </li>
          <li>
            <b>Service Level Trend chart</b> — ≤60s attainment per day with 90%
            target reference line
          </li>
        </Text>
      </>
    ),
  },
  {
    icon: IconCalendar,
    title: "WBR",
    body: (
      <>
        <Text size="sm">
          Detailed operational view for weekly business reviews:
        </Text>
        <Text size="sm" component="ul" mt={4}>
          <li>
            <b>Executive Summary</b> — compares filtered data against overall
            averages
          </li>
          <li>
            <b>Big Number Cards</b> — record count and average times (connect,
            handle, ACW)
          </li>
          <li>
            <b>Metrics Summary</b> — avg, min, max, median, and count for each
            KPI
          </li>
          <li>
            <b>Data Table</b> — sortable, paginated view of every record
          </li>
          <li>
            <b>Export Toolbar</b> — copy summary, export data, and quick start
            guide
          </li>
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
        <Text size="sm">
          Tracks Service Level Agreement attainment by day and shift:
        </Text>
        <Text size="sm" component="ul" mt={4}>
          <li>
            <b>Agent Connect Time SLA</b> — % of contacts connected within 30s,
            60s, and 120s (initiation → connected)
          </li>
          <li>
            <b>Queue Time SLA</b> — % answered within 30s, 60s, and 120s from
            enqueue (excludes IVR time)
          </li>
          <li>
            <b>Contact Volume by Shift</b> — number of contacts handled per day
            split by shift
          </li>
          <li>
            <b>SLA by Shift table</b> — aggregated attainment rates per shift
          </li>
        </Text>
        <Text size="sm" mt={4}>
          Each chart has a daily/weekly toggle and a 90% target reference line.
        </Text>
      </>
    ),
  },
  {
    icon: IconExclamationCircle,
    title: "Abandonment Analysis",
    body: (
      <>
        <Text size="sm">
          Contacts initiated but never connected to an agent:
        </Text>
        <Text size="sm" component="ul" mt={4}>
          <li>
            <b>Overall cards</b> — total contacts, abandoned count, and
            abandonment rate
          </li>
          <li>
            <b>By Queue chart</b> — queues with the highest abandonment counts
          </li>
          <li>
            <b>Disconnect Reason chart</b> — why abandoned contacts ended
          </li>
          <li>
            <b>By Shift chart</b> — answered vs abandoned per shift
          </li>
          <li>
            <b>Daily Trend chart</b> — answered vs abandoned over time
          </li>
          <li>
            <b>Queue Abandonment Rates table</b> — full breakdown across all
            queues
          </li>
          <li>
            <b>Abandoned Records table</b> — individual abandoned records with
            contact duration
          </li>
        </Text>
      </>
    ),
  },
];

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
    label: "SLA Attainment (Agent Connect)",
    def: "Percentage of contacts connected to an agent within a given threshold (30s, 60s, or 120s) from initiation timestamp. Calculated per day and shift.",
    unit: "%",
  },
  {
    label: "SLA Attainment (Queue Time)",
    def: "Percentage of contacts answered within a given threshold (30s, 60s, or 120s) from enqueue timestamp. Excludes IVR/prompt time before queuing.",
    unit: "%",
  },
  {
    label: "Abandonment Rate",
    def: "Percentage of contacts that were initiated but never connected to an agent (empty connectedToAgentTimestamp).",
    unit: "%",
  },
];

export function SamplePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Paper shadow="sm" radius="md" p="md" className="glass-panel">
        <Text fw={600} size="lg" mb="md">
          Usage & Definitions
        </Text>

        <Stack gap="lg">
          <div>
            <Text fw={600} size="sm" mb="xs" c="dimmed">
              HOW IT WORKS
            </Text>
            <Divider mb="sm" />
            <Stack gap="md">
              {sections.map(({ icon: Icon, title, body }) => (
                <Group key={title} gap="sm" align="flex-start">
                  <Icon
                    size={20}
                    style={{ marginTop: 2, flexShrink: 0, opacity: 0.5 }}
                  />
                  <div>
                    <Text fw={600} size="sm">
                      {title}
                    </Text>
                    <Text size="sm" c="dimmed" lh={1.6}>
                      {body}
                    </Text>
                  </div>
                </Group>
              ))}
            </Stack>
          </div>

          <div>
            <Text fw={600} size="sm" mb="xs" c="dimmed">
              PAGES
            </Text>
            <Divider mb="sm" />
            <Stack gap="md">
              {pages.map(({ icon: Icon, title, body }) => (
                <Group key={title} gap="sm" align="flex-start">
                  <Icon
                    size={20}
                    style={{ marginTop: 2, flexShrink: 0, opacity: 0.5 }}
                  />
                  <div>
                    <Text fw={600} size="sm">
                      {title}
                    </Text>
                    <div
                      style={{
                        color: "var(--mantine-color-dimmed)",
                        lineHeight: 1.6,
                      }}
                    >
                      {body}
                    </div>
                  </div>
                </Group>
              ))}
            </Stack>
          </div>

          <div>
            <Text fw={600} size="sm" mb="xs" c="dimmed">
              MEASURES
            </Text>
            <Divider mb="sm" />
            <Stack gap="md">
              {measures.map(({ label, def, unit }) => (
                <Group key={label} gap="sm" align="flex-start">
                  <div>
                    <Text fw={600} size="sm">
                      {label}
                    </Text>
                    <Text size="sm" c="dimmed" lh={1.6}>
                      {def}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      Unit: {unit}
                    </Text>
                  </div>
                </Group>
              ))}
            </Stack>
          </div>
        </Stack>
      </Paper>
    </motion.div>
  );
}
