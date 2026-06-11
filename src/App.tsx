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
  MultiSelect,
  Button,
  Paper,
  AppShell,
  NavLink,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
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
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { ContactRecord, PhoneRecord } from "./types";
import { parseContactCsv, parsePhoneCsv } from "./utils/csvParser";
import { joinData } from "./utils/dataJoiner";
import { calculateMetrics, parseDate } from "./utils/metricsCalculator";
import { DataLoaderModal } from "./components/DataLoaderModal";
import { PhoneDescriptionBreakdown } from "./components/PhoneDescriptionBreakdown";
import { SlaAnalysis } from "./components/SlaAnalysis";
import { AbandonmentAnalysis } from "./components/AbandonmentAnalysis";
import { DashboardOverview } from "./components/DashboardOverview";
import { WbrPage } from "./components/WbrPage";
import { SamplePage } from "./components/SamplePage";
import "./index.css";

export default function App() {
  const [contactRecords, setContactRecords] = useState<ContactRecord[]>([]);
  const [phoneRecords, setPhoneRecords] = useState<PhoneRecord[]>([]);
  const [phoneCustomLoaded, setPhoneCustomLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routingProfileFilter, setRoutingProfileFilter] = useState<string[]>(
    [],
  );
  const [queueFilter, setQueueFilter] = useState<string[]>([]);
  const [descriptionFilter, setDescriptionFilter] = useState<string[]>([]);
  const [initiationMethodFilter, setInitiationMethodFilter] = useState<
    string[]
  >([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [dataLoadedAt, setDataLoadedAt] = useState<Date | null>(null);
  const [dataModalOpened, setDataModalOpened] = useState(false);
  const [freshLabel, setFreshLabel] = useState<string | null>(null);
  const refreshInterval = useRef<number | undefined>(undefined);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const [activePage, setActivePage] = useState<
    "dashboard" | "wbr" | "phone-analysis" | "sla" | "abandonment" | "usage"
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
      setRoutingProfileFilter([]);
      setQueueFilter([]);
      setDescriptionFilter([]);
      setInitiationMethodFilter([]);
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

  const queueOptions = useMemo(() => {
    const values = new Set(
      joinedRecords.reduce<string[]>((acc, r) => {
        if (r.queue) acc.push(r.queue);
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
    if (dateRange[0]) {
      records = records.filter((r) => {
        const d = parseDate(r.initiationTimestamp);
        return d && d >= dateRange[0]!;
      });
    }
    if (dateRange[1]) {
      const end = new Date(dateRange[1].getTime() + 86400000);
      records = records.filter((r) => {
        const d = parseDate(r.initiationTimestamp);
        return d && d < end;
      });
    }
    if (routingProfileFilter.length > 0) {
      records = records.filter(
        (r) => r.routingProfile && routingProfileFilter.includes(r.routingProfile),
      );
    }
    if (queueFilter.length > 0) {
      records = records.filter(
        (r) => r.queue && queueFilter.includes(r.queue),
      );
    }
    if (descriptionFilter.length > 0) {
      records = records.filter(
        (r) => r.phoneDescription && descriptionFilter.includes(r.phoneDescription),
      );
    }
    if (initiationMethodFilter.length > 0) {
      records = records.filter(
        (r) => r.initiationMethod && initiationMethodFilter.includes(r.initiationMethod),
      );
    }
    return records;
  }, [
    joinedRecords,
    dateRange,
    routingProfileFilter,
    queueFilter,
    descriptionFilter,
    initiationMethodFilter,
  ]);

  const metrics = useMemo(
    () =>
      filteredRecords.length > 0 ? calculateMetrics(filteredRecords) : null,
    [filteredRecords],
  );

  const clearFilters = useCallback(() => {
    setRoutingProfileFilter([]);
    setQueueFilter([]);
    setDescriptionFilter([]);
    setInitiationMethodFilter([]);
    setDateRange([null, null]);
  }, []);

  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    if (dateRange[0] && dateRange[1])
      parts.push(
        `${dateRange[0].toLocaleDateString()} – ${dateRange[1].toLocaleDateString()}`,
      );
    else if (dateRange[0])
      parts.push(`From ${dateRange[0].toLocaleDateString()}`);
    else if (dateRange[1])
      parts.push(`To ${dateRange[1].toLocaleDateString()}`);
    if (routingProfileFilter.length > 0)
      parts.push(`Routing Profile: ${routingProfileFilter.join(', ')}`);
    if (queueFilter.length > 0)
      parts.push(`Queue: ${queueFilter.join(', ')}`);
    if (initiationMethodFilter.length > 0)
      parts.push(`Initiation: ${initiationMethodFilter.join(', ')}`);
    if (descriptionFilter.length > 0)
      parts.push(`Description: ${descriptionFilter.join(', ')}`);
    return parts.join(", ");
  }, [
    dateRange,
    routingProfileFilter,
    queueFilter,
    initiationMethodFilter,
    descriptionFilter,
  ]);

  const hasFilter =
    !!(dateRange[0] || dateRange[1]) ||
    routingProfileFilter.length > 0 ||
    queueFilter.length > 0 ||
    descriptionFilter.length > 0 ||
    initiationMethodFilter.length > 0;

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
                  radius="md"
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
            label="WBR"
            leftSection={<IconCalendar size={20} />}
            active={activePage === "wbr"}
            onClick={() => setActivePage("wbr")}
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
            label="Abandonment"
            leftSection={<IconExclamationCircle size={20} />}
            active={activePage === "abandonment"}
            onClick={() => setActivePage("abandonment")}
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
                    radius="md"
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
                    radius="md"
                    className="glass-panel"
                  >
                    <Stack gap="sm">
                      <Group gap="sm" align="end" grow preventGrowOverflow={false}>
                        <DatePickerInput
                          type="range"
                          label="Date Range"
                          placeholder="Pick dates"
                          value={dateRange}
                          onChange={setDateRange}
                          clearable
                          leftSection={<IconCalendar size={16} />}
                          style={{ minWidth: 200 }}
                        />
                        <MultiSelect
                          label="Initiation Method"
                          placeholder="All methods"
                          data={initiationMethodOptions}
                          value={initiationMethodFilter}
                          onChange={setInitiationMethodFilter}
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
                          data={queueOptions}
                          value={queueFilter}
                          onChange={setQueueFilter}
                          clearable
                          searchable
                          style={{ minWidth: 140 }}
                          leftSection={<IconFilter size={14} />}
                        />
                        <MultiSelect
                          label="Routing Profile"
                          placeholder="All routing profiles"
                          data={routingProfileOptions}
                          value={routingProfileFilter}
                          onChange={setRoutingProfileFilter}
                          clearable
                          searchable
                          style={{ minWidth: 140 }}
                          leftSection={<IconFilter size={14} />}
                        />
                        <MultiSelect
                          label="Phone Description"
                          placeholder="All descriptions"
                          data={descriptionOptions}
                          value={descriptionFilter}
                          onChange={setDescriptionFilter}
                          clearable
                          searchable
                          style={{ minWidth: 140 }}
                          leftSection={<IconFilter size={14} />}
                        />
                        {hasFilter && (
                          <Button
                            variant="subtle"
                            color="gray"
                            onClick={clearFilters}
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

              {activePage === "dashboard" && (
                <DashboardOverview records={filteredRecords} />
              )}

              {activePage === "wbr" && (
                <WbrPage
                  records={filteredRecords}
                  totalRecords={joinedRecords.length}
                  filteredRecords={filteredRecords.length}
                  metrics={metrics}
                  overallMetrics={overallMetrics}
                  filterLabel={filterLabel}
                  missingDescriptionCount={missingDescriptionCount}
                  contactRecordsLength={contactRecords.length}
                />
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

              {activePage === "abandonment" && (
                <AbandonmentAnalysis records={filteredRecords} />
              )}

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
