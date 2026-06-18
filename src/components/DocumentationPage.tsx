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
  IconUser,
  IconClock,
  IconHourglass,
  IconCloud,
  IconRefresh,
} from "@tabler/icons-react";

const sections = [
  {
    icon: IconCloud,
    title: "Account & Login",
    body: "Sign in with the shared team credentials. Sessions persist across browser refreshes — you stay logged in until you click the sign-out button in the header.",
  },
  {
    icon: IconDatabase,
    title: "Data Storage",
    body: "All uploaded data lives in Supabase (Postgres). Each upload upserts by contact_id, so re-uploading the same CSV updates existing rows and new rows get added. Data persists across sessions and is shared across all users signed into the same account.",
  },
  {
    icon: IconRefresh,
    title: "Live Updates",
    body: "The app subscribes to Supabase real-time events. New or updated rows appear in the dashboard within ~2 seconds of landing in the database — no manual refresh needed.",
  },
  {
    icon: IconUpload,
    title: "Loading Data",
    body: "Click the records badge or 'Load Data' in the header. Follow the 2-step wizard: upload the Phone Numbers CSV first, then the Contact Search Results CSV. Uploads happen in 1000-row batches with a progress notification; nothing in the existing database is deleted.",
  },
  {
    icon: IconFilter,
    title: "Filters",
    body: "Four multiselect filters sit at the top of every page: Queue, Routing Profile, Initiation Method, and Phone Description. All charts and tables update instantly when you change a filter. Click 'Clear' to reset all filters. Filters are searchable and support multiple selections.",
  },
  {
    icon: IconCalendar,
    title: "Date Filter",
    body: "The date picker supports two modes via a Single/Range toggle. In Range mode, pick a start and end date. In Single mode, pick one day. Days that have contact data show a small teal dot underneath the day number so you can see which days are populated at a glance.",
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
        <Text size="sm">Executive overview:</Text>
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
    icon: IconUser,
    title: "Agent",
    body: (
      <>
        <Text size="sm">Per-agent performance for managers and team leads:</Text>
        <Text size="sm" component="ul" mt={4}>
          <li>
            <b>Summary cards</b> — active agents, total contacts, team avg connect
            time, team SLA ≤60s
          </li>
          <li>
            <b>Sortable table</b> — every agent with contacts handled, avg connect / handle /
            ACW times, SLA ≤20s / 60s / 120s, queue time SLA, and queues covered. Click any
            column header to re-sort. Color-coded against team averages and SLA targets.
          </li>
          <li>
            <b>Click any agent</b> to open a detail modal with their daily volume chart,
            shift performance breakdown, and top queues
          </li>
          <li>
            <b>Top 10 by volume</b> — horizontal bar chart at the bottom for at-a-glance
            workload distribution
          </li>
        </Text>
      </>
    ),
  },
  {
    icon: IconChartLine,
    title: "SLA Analysis",
    body: (
      <>
        <Text size="sm">
          Tracks Service Level Agreement attainment by day and shift (connected
          contacts only — abandoned calls are excluded):
        </Text>
        <Text size="sm" component="ul" mt={4}>
          <li>
            <b>Agent Connect Time SLA</b> — % of contacts connected within 20s,
            60s, and 120s (initiation → connected)
          </li>
          <li>
            <b>Queue Time SLA</b> — % answered within 20s, 60s, and 120s from
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
    icon: IconHourglass,
    title: "SLA (Inclusive)",
    body: (
      <>
        <Text size="sm">
          Same as SLA Analysis but abandoned contacts are included in the
          denominator:
        </Text>
        <Text size="sm" component="ul" mt={4}>
          <li>
            <b>Wait time</b> — for connected contacts, measured from
            initiation → connected. For abandoned contacts, measured from
            initiation → disconnect.
          </li>
          <li>
            <b>Standard vs Inclusive comparison table</b> — shows the drop in
            attainment for each threshold, which equals the share of contacts
            that abandoned before the threshold
          </li>
          <li>
            <b>By-shift breakdown</b> with abandonment included
          </li>
          <li>
            <b>Threshold alert</b> — if abandonment is &gt; 30%, an orange
            warning highlights the impact
          </li>
        </Text>
        <Text size="sm" mt={4}>
          Queue time SLA still only applies to connected contacts since
          abandoners never connected.
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
    def: "Percentage of contacts connected to an agent within a given threshold (20s, 60s, or 120s) from initiation timestamp. Calculated per day and shift. Only includes contacts that connected.",
    unit: "%",
  },
  {
    label: "SLA Attainment (Queue Time)",
    def: "Percentage of contacts answered within a given threshold (20s, 60s, or 120s) from enqueue timestamp. Excludes IVR/prompt time before queuing. Only includes contacts that connected.",
    unit: "%",
  },
  {
    label: "SLA Attainment (Inclusive)",
    def: "Same as Agent Connect SLA, but abandoned contacts are included in the denominator. Their wait time is initiation → disconnect, and is compared against the same 20s/60s/120s thresholds. Shows how many customers were served within the target time, including those who gave up waiting.",
    unit: "%",
  },
  {
    label: "Abandonment Rate",
    def: "Percentage of contacts that were initiated but never connected to an agent (empty connectedToAgentTimestamp).",
    unit: "%",
  },
];

export function DocumentationPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Paper shadow="sm" radius="md" p="md" className="glass-panel">
        <Text fw={600} size="lg" mb="md">
          Documentation
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
