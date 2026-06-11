import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  Select,
  Button,
  Paper,
  AppShell,
  NavLink,
} from "@mantine/core";
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
  IconFile,
  IconChartLine,
  IconBook,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { ContactRecord, PhoneRecord } from "./types";
import { parseContactCsv, parsePhoneCsv } from "./utils/csvParser";
import { joinData } from "./utils/dataJoiner";
import { calculateMetrics } from "./utils/metricsCalculator";
import { DataLoaderModal } from "./components/DataLoaderModal";
import { BigNumberCard } from "./components/BigNumberCard";
import { MetricsTable } from "./components/MetricsTable";
import { MetricsSummary } from "./components/MetricsSummary";
import { ExportToolbar } from "./components/ExportToolbar";
import { ExecutiveSummary } from "./components/ExecutiveSummary";
import { PhoneDescriptionBreakdown } from "./components/PhoneDescriptionBreakdown";
import { SlaAnalysis } from "./components/SlaAnalysis";
import { SamplePage } from "./components/SamplePage";
import "./index.css";

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

export default function App() {
  const [contactRecords, setContactRecords] = useState<ContactRecord[]>([]);
  const [phoneRecords, setPhoneRecords] = useState<PhoneRecord[]>([]);
  const [phoneCustomLoaded, setPhoneCustomLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routingProfileFilter, setRoutingProfileFilter] = useState<
    string | null
  >(null);
  const [descriptionFilter, setDescriptionFilter] = useState<string | null>(
    null,
  );
  const [initiationMethodFilter, setInitiationMethodFilter] = useState<
    string | null
  >(null);
  const [dataLoadedAt, setDataLoadedAt] = useState<Date | null>(null);
  const [dataModalOpened, setDataModalOpened] = useState(false);
  const [freshLabel, setFreshLabel] = useState<string | null>(null);
  const refreshInterval = useRef<number | undefined>(undefined);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const [activePage, setActivePage] = useState<
    "dashboard" | "phone-analysis" | "sla" | "usage"
  >("dashboard");

  useEffect(() => {
    if (!dataLoadedAt) {
      setFreshLabel(null);
      return;
    }
    const update = () => {
      const secs = Math.floor((Date.now() - dataLoadedAt.getTime()) / 1000);
      if (secs < 60) setFreshLabel("Loaded just now");
      else if (secs < 120) setFreshLabel("Loaded 1 min ago");
      else setFreshLabel(`Loaded ${Math.floor(secs / 60)} min ago`);
    };
    update();
    refreshInterval.current = window.setInterval(update, 30000);
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, [dataLoadedAt]);

  const handleContactsUpload = (text: string) => {
    try {
      const parsed = parseContactCsv(text);
      if (parsed.length === 0) {
        setError("No records found in contacts CSV");
        return;
      }
      setContactRecords(parsed);
      setDataLoadedAt(new Date());
      setRoutingProfileFilter(null);
      setDescriptionFilter(null);
      setInitiationMethodFilter(null);
      setError(null);
    } catch {
      setError("Failed to parse contacts CSV");
    }
  };

  const handlePhonesUpload = (text: string) => {
    try {
      const parsed = parsePhoneCsv(text);
      if (parsed.length === 0) {
        setError("No phone numbers found in CSV");
        return;
      }
      setPhoneRecords(parsed);
      setPhoneCustomLoaded(true);
      setError(null);
    } catch {
      setError("Failed to parse phone numbers CSV");
    }
  };

  const joinedRecords = useMemo(
    () =>
      contactRecords.length > 0 ? joinData(contactRecords, phoneRecords) : [],
    [contactRecords, phoneRecords],
  );

  const overallMetrics = useMemo(
    () => (joinedRecords.length > 0 ? calculateMetrics(joinedRecords) : null),
    [joinedRecords],
  );

  const routingProfileOptions = useMemo(() => {
    const values = new Set(
      joinedRecords.reduce<string[]>((acc, r) => {
        if (r.routingProfile) acc.push(r.routingProfile);
        return acc;
      }, []),
    );
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({ value: v, label: v }));
  }, [joinedRecords]);

  const descriptionOptions = useMemo(() => {
    const values = new Set(
      joinedRecords.reduce<string[]>((acc, r) => {
        if (r.phoneDescription) acc.push(r.phoneDescription);
        return acc;
      }, []),
    );
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({ value: v, label: v }));
  }, [joinedRecords]);

  const initiationMethodOptions = useMemo(() => {
    const values = new Set(
      joinedRecords.reduce<string[]>((acc, r) => {
        if (r.initiationMethod) acc.push(r.initiationMethod);
        return acc;
      }, []),
    );
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({ value: v, label: v }));
  }, [joinedRecords]);

  const filteredRecords = useMemo(() => {
    let records = joinedRecords;
    if (routingProfileFilter) {
      records = records.filter(
        (r) => r.routingProfile === routingProfileFilter,
      );
    }
    if (descriptionFilter) {
      records = records.filter((r) => r.phoneDescription === descriptionFilter);
    }
    if (initiationMethodFilter) {
      records = records.filter(
        (r) => r.initiationMethod === initiationMethodFilter,
      );
    }
    return records;
  }, [
    joinedRecords,
    routingProfileFilter,
    descriptionFilter,
    initiationMethodFilter,
  ]);

  const metrics = useMemo(
    () =>
      filteredRecords.length > 0 ? calculateMetrics(filteredRecords) : null,
    [filteredRecords],
  );

  const clearFilters = useCallback(() => {
    setRoutingProfileFilter(null);
    setDescriptionFilter(null);
    setInitiationMethodFilter(null);
  }, []);

  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    if (routingProfileFilter)
      parts.push(`Routing Profile: ${routingProfileFilter}`);
    if (initiationMethodFilter)
      parts.push(`Initiation: ${initiationMethodFilter}`);
    if (descriptionFilter) parts.push(`Description: ${descriptionFilter}`);
    return parts.join(", ");
  }, [routingProfileFilter, initiationMethodFilter, descriptionFilter]);

  const hasFilter = !!(
    routingProfileFilter ||
    descriptionFilter ||
    initiationMethodFilter
  );

  const missingDescriptionCount = useMemo(
    () => joinedRecords.filter((r) => !r.phoneDescription).length,
    [joinedRecords],
  );

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
                {freshLabel && <span> &middot; {freshLabel}</span>}
              </Text>
            </Group>

            <Group wrap="nowrap">
              {joinedRecords.length > 0 ? (
                <Paper
                  shadow="xs"
                  py={6}
                  px="md"
                  radius="xl"
                  className="glass-panel"
                  style={{ cursor: "pointer" }}
                  onClick={() => setDataModalOpened(true)}
                >
                  <Group gap="xs">
                    <IconUpload size={14} />
                    <Text size="sm" fw={500}>
                      {joinedRecords.length.toLocaleString()} records
                    </Text>
                    <Text size="xs" c="dimmed" visibleFrom="sm">
                      &middot; {phoneRecords.length.toLocaleString()} numbers
                    </Text>
                  </Group>
                </Paper>
              ) : (
                <Button
                  leftSection={<IconUpload size={16} />}
                  onClick={() => setDataModalOpened(true)}
                  radius="xl"
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
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="sm">
          <NavLink
            label="Dashboard"
            leftSection={<IconChartBar size={20} />}
            active={activePage === "dashboard"}
            onClick={() => setActivePage("dashboard")}
            variant="light"
            style={{ borderRadius: "var(--mantine-radius-xl)", marginBottom: 4 }}
          />
          <NavLink
            label="Phone Analysis"
            leftSection={<IconPhone size={20} />}
            active={activePage === "phone-analysis"}
            onClick={() => setActivePage("phone-analysis")}
            variant="light"
            style={{ borderRadius: "var(--mantine-radius-xl)", marginBottom: 4 }}
          />
          <NavLink
            label="SLA"
            leftSection={<IconChartLine size={20} />}
            active={activePage === "sla"}
            onClick={() => setActivePage("sla")}
            variant="light"
            style={{ borderRadius: "var(--mantine-radius-xl)", marginBottom: 4 }}
          />
          <NavLink
            label="Usage & Definitions"
            leftSection={<IconBook size={20} />}
            active={activePage === "usage"}
            onClick={() => setActivePage("usage")}
            variant="light"
            style={{ borderRadius: "var(--mantine-radius-xl)" }}
          />
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
                    radius="xl"
                  >
                    {error}
                  </Alert>
                </motion.div>
              )}

              {joinedRecords.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Paper
                    shadow="sm"
                    p="sm"
                    radius="xl"
                    className="glass-panel"
                  >
                    <Group gap="sm" align="end">
                      <Select
                        label="Routing Profile"
                        placeholder="All routing profiles"
                        data={routingProfileOptions}
                        value={routingProfileFilter}
                        onChange={setRoutingProfileFilter}
                        clearable
                        searchable
                        style={{ flex: 1, minWidth: 180 }}
                        leftSection={<IconFilter size={14} />}
                      />
                      <Select
                        label="Initiation Method"
                        placeholder="All methods"
                        data={initiationMethodOptions}
                        value={initiationMethodFilter}
                        onChange={setInitiationMethodFilter}
                        clearable
                        searchable
                        style={{ flex: 1, minWidth: 180 }}
                        leftSection={<IconFilter size={14} />}
                      />
                      <Select
                        label="Phone Description"
                        placeholder="All descriptions"
                        data={descriptionOptions}
                        value={descriptionFilter}
                        onChange={setDescriptionFilter}
                        clearable
                        searchable
                        style={{ flex: 1, minWidth: 180 }}
                        leftSection={<IconFilter size={14} />}
                      />
                      {hasFilter && (
                        <Button
                          variant="subtle"
                          color="gray"
                          onClick={clearFilters}
                          leftSection={<IconFilterOff size={16} />}
                          style={{ marginBottom: 1 }}
                        >
                          Clear
                        </Button>
                      )}
                    </Group>
                  </Paper>
                </motion.div>
              )}

              {activePage === "dashboard" && (
                <Stack gap="md">
                  {joinedRecords.length > 0 && (
                    <>
                      {metrics && (
                        <ExecutiveSummary
                          metrics={metrics}
                          overallMetrics={overallMetrics}
                          totalRecords={joinedRecords.length}
                          filteredRecords={filteredRecords.length}
                          filterLabel={filterLabel}
                        />
                      )}

                      {metrics && (
                        <ExportToolbar
                          records={filteredRecords}
                          metrics={metrics}
                          totalRecords={joinedRecords.length}
                          filteredRecords={filteredRecords.length}
                          filterLabel={filterLabel}
                        />
                      )}

                      {metrics && (
                        <motion.div
                          variants={staggerContainer}
                          initial="hidden"
                          animate="visible"
                        >
                          <Group grow>
                            <BigNumberCard
                              label="Records"
                              value={filteredRecords.length}
                              index={0}
                            />
                            <BigNumberCard
                              label="Avg Agent Connect Time"
                              stats={metrics.agentConnectTime}
                              index={1}
                            />
                            <BigNumberCard
                              label="Avg Handle Time"
                              stats={metrics.handleTime}
                              index={2}
                            />
                            <BigNumberCard
                              label="Avg After ACW Time"
                              stats={metrics.acwTime}
                              index={3}
                            />
                          </Group>
                        </motion.div>
                      )}

                      {metrics && (
                        <MetricsSummary
                          metrics={metrics}
                          totalRecords={joinedRecords.length}
                          filteredRecords={filteredRecords.length}
                          filterLabel={filterLabel}
                        />
                      )}

                  {filteredRecords.length > 0 && (
                        <MetricsTable records={filteredRecords} />
                      )}

                      {missingDescriptionCount > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.3 }}
                        >
                          <Alert color="yellow" variant="light" radius="xl">
                            <Group gap="xs">
                              <Text fw={600}>
                                {missingDescriptionCount.toLocaleString()}{" "}
                                records
                              </Text>
                              <Text c="dimmed">
                                have no phone description — the Phone
                                Description filter will not show those entries
                              </Text>
                            </Group>
                          </Alert>
                        </motion.div>
                      )}
                    </>
                  )}

                  {contactRecords.length > 0 && !metrics && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Alert color="blue" variant="light" radius="xl">
                        <Group gap="xs">
                          <Text fw={600}>
                            {joinedRecords.length.toLocaleString()} contact
                            records
                          </Text>
                          <Text c="dimmed">
                            loaded — no metrics available (timestamps may be
                            empty)
                          </Text>
                        </Group>
                      </Alert>
                    </motion.div>
                  )}
                </Stack>
              )}

              {activePage === "phone-analysis" && (
                <PhoneDescriptionBreakdown
                  records={filteredRecords}
                  totalRecords={joinedRecords.length}
                  filteredRecords={filteredRecords.length}
                  filterLabel={filterLabel}
                />
              )}

              {activePage === "sla" && <SlaAnalysis records={filteredRecords} />}

              {activePage === "usage" && <SamplePage />}
            </Stack>
          </Container>
        </AppShell.Main>
      </AppShell>

      <DataLoaderModal
        opened={dataModalOpened}
        onClose={() => setDataModalOpened(false)}
        onPhonesUpload={handlePhonesUpload}
        onContactsUpload={handleContactsUpload}
        phoneLoaded={phoneCustomLoaded}
        contactsLoaded={contactRecords.length > 0}
        phoneCount={phoneRecords.length}
        contactCount={contactRecords.length}
      />
    </Box>
  );
}
