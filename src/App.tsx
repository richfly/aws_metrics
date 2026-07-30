import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useFeatureFlagEnabled } from "@posthog/react";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Alert,
  ActionIcon,
  Tooltip,
  Box,
  MultiSelect,
  Button,
  Paper,
  AppShell,
  NavLink,
  Loader,
  Center,
  SegmentedControl,
} from "@mantine/core";
import { DatePickerPopover, type DatePreset } from "./components/DatePickerPopover";
import { useMantineColorScheme } from "@mantine/core";
import {
  IconAlertCircle,
  IconSun,
  IconMoon,
  IconFilter,
  IconFilterOff,
  IconUpload,
  IconChartBar,
  IconPhone,
  IconChartLine,
  IconBook,
  IconCalendar,
  IconExclamationCircle,
  IconLogout,
  IconHourglass,
  IconUser,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { ContactRecord } from "./types";
import { calculateMetrics, localDateStr, parseDate } from "./utils/metricsCalculator";
import { DataLoaderModal } from "./components/DataLoaderModal";
import { PhoneDescriptionBreakdown } from "./components/PhoneDescriptionBreakdown";
import { SlaAnalysis } from "./components/SlaAnalysis";
import { SlaInclusiveAnalysis } from "./components/SlaInclusiveAnalysis";
import { AbandonmentAnalysis } from "./components/AbandonmentAnalysis";
import { AnomalyDetection } from "./components/AnomalyDetection";
import { AgentPerformance } from "./components/AgentPerformance";
import { DashboardOverview } from "./components/DashboardOverview";
import { WbrPage } from "./components/WbrPage";
import { DocumentationPage } from "./components/DocumentationPage";
import { ContentSkeleton } from "./components/ContentSkeleton";
import { LoginPage } from "./components/LoginPage";
import { useAuth } from "./contexts/AuthContext";
import { useDataLoader } from "./hooks/useDataLoader";
import { useFilters } from "./hooks/useFilters";
import { useTimeLabel } from "./hooks/useTimeLabel";
import { useFilterOptions } from "./hooks/useFilterOptions";
import { useDatePresets } from "./hooks/useDatePresets";
import { useUploader } from "./hooks/useUploader";
import { useReviewers, useCurrentReviewer } from "./hooks/useReviewers";
import { useWorkflowMaterializer } from "./hooks/useWorkflowMaterializer";
import { useWorkflows } from "./hooks/useWorkflows";
import { ReviewerSelector } from "./components/reviewers/ReviewerSelector";
import { WorkflowsPage } from "./components/workflows/WorkflowsPage";
import { MyQueue } from "./components/queue/MyQueue";
import posthog from "./lib/posthog";
import "./index.css";

const NAV_LINKS = [
  { id: "dashboard" as const, label: "Dashboard", icon: IconChartBar },
  { id: "wbr" as const, label: "WBR", icon: IconCalendar },
  { id: "phone-analysis" as const, label: "Phone Analysis", icon: IconPhone },
  { id: "sla" as const, label: "SLA", icon: IconChartLine },
  { id: "sla-inclusive" as const, label: "SLA (inclusive)", icon: IconHourglass },
  { id: "abandonment" as const, label: "Abandonment", icon: IconExclamationCircle },
  { id: "anomalies" as const, label: "Anomalies", icon: IconAlertTriangle },
  { id: "agent" as const, label: "Agent", icon: IconUser },
  { id: "usage" as const, label: "Documentation", icon: IconBook },
]

type WorkflowNavId = "workflows" | "my_queue"
const WORKFLOW_NAV: Array<{ id: WorkflowNavId; label: string; icon: typeof IconChartBar }> = [
  { id: "workflows", label: "Workflows", icon: IconFilter },
  { id: "my_queue",  label: "My Queue",  icon: IconUser },
]

type ActivePage = (typeof NAV_LINKS)[number]["id"] | WorkflowNavId

export default function App() {
  const { session, loading, signOut } = useAuth();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const [activePage, setActivePage] = useState<ActivePage>("dashboard");
  const [dataModalOpened, setDataModalOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { reviewers } = useReviewers();
  const { current: currentReviewer, setCurrent: setCurrentReviewer } = useCurrentReviewer(reviewers);

  const handleReviewerChange = useCallback((id: string) => {
    setCurrentReviewer(id)
    posthog.capture("reviewer_switched", { reviewer_id: id })
  }, [setCurrentReviewer])

  const data = useDataLoader(session);
  const filters = useFilters(data.joinedRecords);
  const timeLabel = useTimeLabel(data.dataLoadedAt);
  const options = useFilterOptions(data.joinedRecords);
  const datePresets = useDatePresets(filters.dateMode);

  const handleUploadSuccess = useCallback(
    (info: { count: number; label: string }) => {
      timeLabel.setLastUploadInfo(info)
    },
    [timeLabel],
  )

  const handleSignOut = useCallback(async () => {
    posthog.capture("user_signed_out")
    await signOut()
  }, [signOut])

  const handleNavigation = useCallback((page: ActivePage) => {
    setActivePage(page)
    posthog.register({ current_section: page })
    posthog.capture("dashboard_section_viewed", { section: page })
  }, [])

  useEffect(() => {
    posthog.register({ color_scheme: isDark ? "dark" : "light" })
  }, [isDark])

  const slaInclusiveEnabled = useFeatureFlagEnabled("sla-inclusive-view")
  const anomaliesEnabled = useFeatureFlagEnabled("anomalies-view")
  const workflowBuilderEnabled = useFeatureFlagEnabled("workflow-builder")

  useEffect(() => {
    if (activePage === "sla-inclusive" && !slaInclusiveEnabled) setActivePage("dashboard")
    if (activePage === "anomalies" && !anomaliesEnabled) setActivePage("dashboard")
    if ((activePage === "workflows" || activePage === "my_queue") && !workflowBuilderEnabled) {
      setActivePage("dashboard")
    }
  }, [activePage, slaInclusiveEnabled, anomaliesEnabled, workflowBuilderEnabled])

  const visibleNavLinks = useMemo(() => {
    const base = NAV_LINKS.filter((link) => {
      if (link.id === "sla-inclusive") return !!slaInclusiveEnabled
      if (link.id === "anomalies") return !!anomaliesEnabled
      return true
    })
    if (!workflowBuilderEnabled) return base
    return [
      ...base.slice(0, 1),
      ...WORKFLOW_NAV,
      ...base.slice(1),
    ]
  }, [slaInclusiveEnabled, anomaliesEnabled, workflowBuilderEnabled])

  const { workflows } = useWorkflows()
  useWorkflowMaterializer({
    workflows,
    records: data.joinedRecords,
    reviewers,
  })

  const { handleContactsUpload, handlePhonesUpload } = useUploader(
    {
      session,
      hasSupabase: !!session,
      fetch: () => data.fetch({ silent: true }),
    },
    {
      onUploadSuccess: handleUploadSuccess,
      setError: (e: string) => setError(e || null),
      clearFilterState: filters.clearFilters,
      setContactRecords: data.setContactRecords,
      setPhoneRecords: data.setPhoneRecords,
      setPhoneCustomLoaded: data.setPhoneCustomLoaded,
      setDataLoadedAt: data.setDataLoadedAt,
    },
  )

  const datesWithData = useMemo(() => {
    const set = new Set<string>()
    for (const r of data.joinedRecords) {
      if (r.initiationTimestamp) {
        const d = parseDate(r.initiationTimestamp)
        if (d) set.add(localDateStr(d))
      }
    }
    return set
  }, [data.joinedRecords])

  const renderDay = useCallback(
    (date: Date) => {
      const dateStr = localDateStr(date)
      const hasData = datesWithData.has(dateStr)
      return (
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            gap: 2,
          }}
        >
          <div style={{ lineHeight: 1 }}>{date.getDate()}</div>
          {hasData && (
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--mantine-color-teal-5)",
              }}
            />
          )}
        </div>
      )
    },
    [datesWithData],
  )

  const overallMetrics = useMemo(
    () => (data.joinedRecords.length > 0 ? calculateMetrics(data.joinedRecords) : null),
    [data.joinedRecords],
  )

  const missingDescriptionCount = useMemo(
    () => data.joinedRecords.filter((r) => !r.phoneDescription).length,
    [data.joinedRecords],
  )

  if (loading) {
    return (
      <Box className="app-bg" style={{ minHeight: "100vh" }}>
        <Center style={{ minHeight: "100vh" }}>
          <Loader size="lg" />
        </Center>
      </Box>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <Box className="app-bg" style={{ minHeight: "100vh" }}>
      <AppShell
        header={{ height: 56 }}
        navbar={{ width: 180, breakpoint: 0 }}
        padding={0}
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
              <Title order={1} style={{ fontSize: "1.25rem", fontWeight: 600 }}>
                Contact Metrics
              </Title>
              <Text c="dimmed" size="sm" visibleFrom="sm">
                Agent Connect, ACW &amp; Handle Times
                {timeLabel.freshLabel && <span> &middot; {timeLabel.freshLabel}</span>}
                {data.loadingProgress && (
                  <span>
                    {" "}&middot; Loading {data.loadingProgress.loaded.toLocaleString()}
                    {data.loadingProgress.total
                      ? ` of ${data.loadingProgress.total.toLocaleString()}`
                      : ""}{" "}
                    records
                  </span>
                )}
                {!data.loadingProgress && data.supabaseLoading && <span> &middot; Syncing...</span>}
              </Text>
            </Group>

            <Group wrap="nowrap">
              {data.supabaseLoading ? (
                <Loader size="sm" />
              ) : data.joinedRecords.length > 0 ? (
                <Paper
                  shadow="xs"
                  py={6}
                  px="md"
                  radius="md"
                  className="glass-panel"
                  style={{ cursor: "pointer" }}
                  onClick={() => setDataModalOpened(true)}
                >
                  <Group gap="xs">
                    <IconUpload size={14} />
                    <Text size="sm" fw={500}>
                      {data.joinedRecords.length.toLocaleString()} records
                    </Text>
                    {data.dbContactCount !== null && data.dbContactCount !== data.joinedRecords.length && (
                      <Text size="xs" c="dimmed" visibleFrom="sm">
                        (of {data.dbContactCount.toLocaleString()} in DB)
                      </Text>
                    )}
                    <Text size="xs" c="dimmed" visibleFrom="sm">
                      &middot; {data.phoneRecords.length.toLocaleString()} numbers
                    </Text>
                    {data.dbPhoneCount !== null && data.dbPhoneCount !== data.phoneRecords.length && (
                      <Text size="xs" c="dimmed" visibleFrom="sm">
                        (of {data.dbPhoneCount.toLocaleString()} in DB)
                      </Text>
                    )}
                  </Group>
                </Paper>
              ) : (
                <Button
                  leftSection={<IconUpload size={16} />}
                  onClick={() => setDataModalOpened(true)}
                  radius="md"
                  variant="light"
                  size="sm"
                >
                  Load Data
                </Button>
              )}
              <Tooltip label={`Switch to ${isDark ? "light" : "dark"} mode`}>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  radius="xl"
                  onClick={() => toggleColorScheme()}
                >
                  {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
                </ActionIcon>
              </Tooltip>
              <ReviewerSelector
                reviewers={reviewers}
                current={currentReviewer}
                onSelect={handleReviewerChange}
              />
              <Tooltip label="Sign out">
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  radius="xl"
                  onClick={handleSignOut}
                >
                  <IconLogout size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="sm">
          {visibleNavLinks.map((link) => (
            <NavLink
              key={link.id}
              label={link.label}
              leftSection={<link.icon size={20} />}
              active={activePage === link.id}
              onClick={() => handleNavigation(link.id)}
              variant="light"
              style={{
                borderRadius: "var(--mantine-radius-xl)",
                marginBottom: 4,
              }}
            />
          ))}
        </AppShell.Navbar>

        <AppShell.Main>
          <Container size="xl" py="md">
            <Stack gap="md">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert
                    icon={<IconAlertCircle size="1rem" />}
                    title="Error"
                    color="red"
                    withCloseButton
                    onClose={() => setError(null)}
                    radius="md"
                  >
                    {error}
                  </Alert>
                </motion.div>
              )}

              {data.joinedRecords.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Paper
                    shadow="sm"
                    p="sm"
                    radius="md"
                    className="glass-panel"
                  >
                    <Stack gap="sm">
                      <Group gap="sm" align="end" grow preventGrowOverflow={false}>
                        <Stack gap={6} style={{ minWidth: 240 }}>
                          <Group justify="space-between" align="center" wrap="nowrap">
                            <Text size="sm" fw={500}>
                              {filters.dateMode === "single" ? "Date" : "Date Range"}
                            </Text>
                            <SegmentedControl
                              size="xs"
                              value={filters.dateMode}
                              onChange={(v) => filters.setDateMode(v as "single" | "range")}
                              data={[
                                { value: "single", label: "Single" },
                                { value: "range", label: "Range" },
                              ]}
                            />
                          </Group>
                          <DatePickerPopover
                            mode={filters.dateMode}
                            value={filters.dateRange}
                            onChange={filters.setDateRange}
                            presets={datePresets as DatePreset[]}
                            renderDay={renderDay}
                            placeholder={filters.dateMode === "single" ? "Pick a date" : "Pick dates"}
                          />
                        </Stack>
                        <MultiSelect
                          label="Initiation Method"
                          placeholder="All methods"
                          data={options.initiationMethodOptions}
                          value={filters.initiationMethodFilter}
                          onChange={filters.setInitiationMethodFilter}
                          clearable
                          searchable
                          style={{ minWidth: 140 }}
                          leftSection={<IconFilter size={14} />}
                        />
                      </Group>
                      <Group gap="sm" align="end" grow preventGrowOverflow={false}>
                        <MultiSelect
                          label="Queue"
                          placeholder="All queues"
                          data={options.queueOptions}
                          value={filters.queueFilter}
                          onChange={filters.setQueueFilter}
                          clearable
                          searchable
                          style={{ minWidth: 140 }}
                          leftSection={<IconFilter size={14} />}
                        />
                        <MultiSelect
                          label="Routing Profile"
                          placeholder="All routing profiles"
                          data={options.routingProfileOptions}
                          value={filters.routingProfileFilter}
                          onChange={filters.setRoutingProfileFilter}
                          clearable
                          searchable
                          style={{ minWidth: 140 }}
                          leftSection={<IconFilter size={14} />}
                        />
                        <MultiSelect
                          label="Phone Description"
                          placeholder="All descriptions"
                          data={options.descriptionOptions}
                          value={filters.descriptionFilter}
                          onChange={filters.setDescriptionFilter}
                          clearable
                          searchable
                          style={{ minWidth: 140 }}
                          leftSection={<IconFilter size={14} />}
                        />
                        {filters.hasFilter && (
                          <Button
                            variant="subtle"
                            color="gray"
                            onClick={filters.clearFilters}
                            leftSection={<IconFilterOff size={16} />}
                            style={{ marginTop: 24 }}
                          >
                            Clear
                          </Button>
                        )}
                      </Group>
                    </Stack>
                  </Paper>
                </motion.div>
              )}

              {activePage === "dashboard" &&
                (data.contactRecords.length === 0 && data.supabaseLoading ? (
                  <ContentSkeleton showTable={false} />
                ) : (
                  <DashboardOverview records={filters.deferredFilteredRecords} />
                ))}

              {activePage === "wbr" &&
                (data.contactRecords.length === 0 && data.supabaseLoading ? (
                  <ContentSkeleton />
                ) : (
                  <WbrPage
                    records={filters.deferredFilteredRecords}
                    totalRecords={data.joinedRecords.length}
                    filteredRecords={filters.deferredFilteredRecords.length}
                    metrics={filters.metrics}
                    overallMetrics={overallMetrics}
                    filterLabel={filters.filterLabel}
                    missingDescriptionCount={missingDescriptionCount}
                    contactRecordsLength={data.contactRecords.length}
                  />
                ))}

              {activePage === "phone-analysis" &&
                (data.contactRecords.length === 0 && data.supabaseLoading ? (
                  <ContentSkeleton showCharts={false} />
                ) : (
                  <PhoneDescriptionBreakdown
                    records={filters.deferredFilteredRecords}
                    totalRecords={data.joinedRecords.length}
                    filteredRecords={filters.deferredFilteredRecords.length}
                    filterLabel={filters.filterLabel}
                  />
                ))}

              {activePage === "agent" &&
                (data.contactRecords.length === 0 && data.supabaseLoading ? (
                  <ContentSkeleton />
                ) : (
                  <AgentPerformance records={filters.deferredFilteredRecords} />
                ))}

              {activePage === "sla" &&
                (data.contactRecords.length === 0 && data.supabaseLoading ? (
                  <ContentSkeleton />
                ) : (
                  <SlaAnalysis records={filters.deferredFilteredRecords} />
                ))}

              {activePage === "sla-inclusive" &&
                slaInclusiveEnabled &&
                (data.contactRecords.length === 0 && data.supabaseLoading ? (
                  <ContentSkeleton />
                ) : (
                  <SlaInclusiveAnalysis records={filters.deferredFilteredRecords} />
                ))}

              {activePage === "abandonment" &&
                (data.contactRecords.length === 0 && data.supabaseLoading ? (
                  <ContentSkeleton />
                ) : (
                  <AbandonmentAnalysis records={filters.deferredFilteredRecords} />
                ))}

              {activePage === "anomalies" &&
                anomaliesEnabled &&
                (data.contactRecords.length === 0 && data.supabaseLoading ? (
                  <ContentSkeleton />
                ) : (
                  <AnomalyDetection records={filters.deferredFilteredRecords} />
                ))}

              {activePage === "usage" && <DocumentationPage />}

              {activePage === "workflows" && (
                <WorkflowsPage records={filters.deferredFilteredRecords} />
              )}

              {activePage === "my_queue" && (
                <MyQueue records={filters.deferredFilteredRecords} />
              )}
            </Stack>
          </Container>
        </AppShell.Main>
      </AppShell>

      <DataLoaderModal
        opened={dataModalOpened}
        onClose={() => setDataModalOpened(false)}
        onPhonesUpload={handlePhonesUpload}
        onContactsUpload={handleContactsUpload}
        phoneLoaded={data.phoneCustomLoaded}
        contactsLoaded={data.contactRecords.length > 0}
        phoneCount={data.phoneRecords.length}
        contactCount={data.contactRecords.length}
      />
    </Box>
  );
}
