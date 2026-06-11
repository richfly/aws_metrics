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
  Loader,
  Center,
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
  IconLogout,
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
import { LoginPage } from "./components/LoginPage";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import { notifications } from "@mantine/notifications";
import "./index.css";

const CONTACT_FIELDS: [keyof ContactRecord, string][] = [
  ["contactId", "contact_id"],
  ["channel", "channel"],
  ["contactStatus", "contact_status"],
  ["initiationTimestamp", "initiation_timestamp"],
  ["systemPhoneNumber", "system_phone_number"],
  ["queue", "queue"],
  ["agent", "agent"],
  ["customerPhoneNumber", "customer_phone_number"],
  ["disconnectTimestamp", "disconnect_timestamp"],
  ["contactDuration", "contact_duration"],
  ["routingProfile", "routing_profile"],
  ["connectedToAgentTimestamp", "connected_to_agent_timestamp"],
  ["scheduledTimestamp", "scheduled_timestamp"],
  ["enqueueTimestamp", "enqueue_timestamp"],
  ["acwStartTimestamp", "acw_start_timestamp"],
  ["acwEndTimestamp", "acw_end_timestamp"],
  ["agentInteractionDuration", "agent_interaction_duration"],
  ["agentConnectionAttempts", "agent_connection_attempts"],
  ["numberOfHolds", "number_of_holds"],
  ["initiationMethod", "initiation_method"],
  ["disconnectReason", "disconnect_reason"],
  ["firstContactFlowName", "first_contact_flow_name"],
  ["contactDirection", "contact_direction"],
  ["preferredAgents", "preferred_agents"],
  ["systemEmailAddress", "system_email_address"],
  ["customerEmailAddress", "customer_email_address"],
  ["phoneDescription", "phone_description"],
  ["phoneType", "phone_type"],
  ["activeChannels", "active_channels"],
  ["contactFlowIvr", "contact_flow_ivr"],
  ["country", "country"],
];

const PHONE_FIELDS: [keyof PhoneRecord, string][] = [
  ["phoneNumber", "phone_number"],
  ["description", "description"],
  ["phoneType", "phone_type"],
  ["activeChannels", "active_channels"],
  ["contactFlowIvr", "contact_flow_ivr"],
  ["country", "country"],
];

function toSnake(record: Record<string, string>, fields: [string, string][]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [camel, snake] of fields) {
    if (record[camel] !== undefined) out[snake] = record[camel];
  }
  return out;
}

function toCamel(row: Record<string, unknown>, fields: [string, string][]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [camel, snake] of fields) {
    const val = row[snake];
    out[camel] = val != null ? String(val) : "";
  }
  return out;
}

async function upsertBatched(
  table: "contacts" | "phone_records",
  rows: Record<string, string>[],
  onConflict: string,
  notifyId: string,
  label: string,
  batchSize = 1000,
): Promise<void> {
  const totalBatches = Math.ceil(rows.length / batchSize);
  for (let i = 0; i < rows.length; i += batchSize) {
    const batchNum = i / batchSize + 1;
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict });
    if (error) {
      throw new Error(`Batch ${batchNum} / ${totalBatches} failed: ${error.message}`);
    }
    notifications.update({
      id: notifyId,
      message: `${batchNum} / ${totalBatches} batches (${label})`,
      loading: true,
    });
  }
}

export default function App() {
  const { session, loading } = useAuth();
  const [contactRecords, setContactRecords] = useState<ContactRecord[]>([]);
  const [phoneRecords, setPhoneRecords] = useState<PhoneRecord[]>([]);
  const [dbContactCount, setDbContactCount] = useState<number | null>(null);
  const [dbPhoneCount, setDbPhoneCount] = useState<number | null>(null);
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
  const [lastUploadInfo, setLastUploadInfo] = useState<{ count: number; label: string } | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const refreshInterval = useRef<number | undefined>(undefined);
  const realtimeDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const [activePage, setActivePage] = useState<
    "dashboard" | "wbr" | "phone-analysis" | "sla" | "abandonment" | "usage"
  >("dashboard");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const fetchFromSupabase = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setSupabaseLoading(true);
    try {
      const PAGE_SIZE = 1000;

      const fetchAllRows = async (table: "contacts" | "phone_records"): Promise<Record<string, unknown>[]> => {
        const all: Record<string, unknown>[] = [];
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          all.push(...(data as Record<string, unknown>[]));
          if (data.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return all;
      };

      const [contactsAll, phonesAll, contactsCountResult, phonesCountResult] = await Promise.all([
        fetchAllRows("contacts"),
        fetchAllRows("phone_records"),
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        supabase.from("phone_records").select("*", { count: "exact", head: true }),
      ]);

      const mappedContacts = contactsAll.map(
        (r) => toCamel(r, CONTACT_FIELDS) as unknown as ContactRecord,
      );
      setContactRecords(mappedContacts);

      const mappedPhones = phonesAll.map(
        (r) => toCamel(r, PHONE_FIELDS) as unknown as PhoneRecord,
      );
      setPhoneRecords(mappedPhones);
      if (mappedPhones.length > 0) setPhoneCustomLoaded(true);

      if (typeof contactsCountResult.count === "number") {
        setDbContactCount(contactsCountResult.count);
      }
      if (typeof phonesCountResult.count === "number") {
        setDbPhoneCount(phonesCountResult.count);
      }

      if (contactsAll.length > 0) {
        setDataLoadedAt(new Date());
        setLastSyncedAt(new Date());
      }
    } catch {
      setError("Failed to load data from server");
    } finally {
      if (!options?.silent) setSupabaseLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchFromSupabase();
    }
  }, [session, fetchFromSupabase]);

  useEffect(() => {
    if (!session) return;

    const handleChange = () => {
      if (realtimeDebounce.current) clearTimeout(realtimeDebounce.current);
      realtimeDebounce.current = setTimeout(() => {
        fetchFromSupabase({ silent: true });
      }, 2000);
    };

    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts" },
        handleChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "phone_records" },
        handleChange,
      )
      .subscribe();

    return () => {
      if (realtimeDebounce.current) clearTimeout(realtimeDebounce.current);
      supabase.removeChannel(channel);
    };
  }, [session, fetchFromSupabase]);

  useEffect(() => {
    if (!dataLoadedAt) {
      setFreshLabel(null);
      return;
    }
    const update = () => {
      const secs = Math.floor((Date.now() - dataLoadedAt.getTime()) / 1000);
      const prefix = lastUploadInfo
        ? `${lastUploadInfo.count.toLocaleString()} ${lastUploadInfo.label} loaded`
        : "Loaded";
      if (secs < 60) setFreshLabel(`${prefix} just now`);
      else if (secs < 120) setFreshLabel(`${prefix} 1 min ago`);
      else setFreshLabel(`${prefix} ${Math.floor(secs / 60)} min ago`);
    };
    update();
    refreshInterval.current = window.setInterval(update, 30000);
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, [dataLoadedAt, lastUploadInfo]);

  const handleContactsUpload = async (text: string) => {
    try {
      const parsed = parseContactCsv(text);
      if (parsed.length === 0) {
        setError("No records found in contacts CSV");
        return;
      }

      if (session) {
        const snakeData = parsed.map(
          (r) => toSnake(r as unknown as Record<string, string>, CONTACT_FIELDS),
        );
        const nId = notifications.show({
          title: "Syncing contacts",
          message: "Starting upload...",
          loading: true,
          autoClose: false,
          withCloseButton: false,
        });
        try {
          await upsertBatched("contacts", snakeData, "contact_id", nId, "contacts");
          notifications.update({
            id: nId,
            title: "Contacts synced",
            message: `${parsed.length.toLocaleString()} records uploaded`,
            color: "teal",
            loading: false,
            autoClose: 3000,
          });
          setLastUploadInfo({ count: parsed.length, label: "contacts" });
          setDataLoadedAt(new Date());
        } catch (e) {
          notifications.update({
            id: nId,
            title: "Sync failed",
            message: (e as Error).message,
            color: "red",
            loading: false,
            autoClose: 5000,
          });
          setError((e as Error).message);
          return;
        }

        await fetchFromSupabase();
      } else {
        setContactRecords(parsed);
        setDataLoadedAt(new Date());
      }

      setRoutingProfileFilter([]);
      setQueueFilter([]);
      setDescriptionFilter([]);
      setInitiationMethodFilter([]);
      setError(null);
    } catch {
      setError("Failed to parse contacts CSV");
    }
  };

  const handlePhonesUpload = async (text: string) => {
    try {
      const parsed = parsePhoneCsv(text);
      if (parsed.length === 0) {
        setError("No phone numbers found in CSV");
        return;
      }

      if (session) {
        const snakeData = parsed.map(
          (r) => toSnake(r as unknown as Record<string, string>, PHONE_FIELDS),
        );
        const nId = notifications.show({
          title: "Syncing phone numbers",
          message: "Starting upload...",
          loading: true,
          autoClose: false,
          withCloseButton: false,
        });
        try {
          await upsertBatched("phone_records", snakeData, "phone_number", nId, "phone numbers");
          notifications.update({
            id: nId,
            title: "Phone numbers synced",
            message: `${parsed.length.toLocaleString()} numbers uploaded`,
            color: "teal",
            loading: false,
            autoClose: 3000,
          });
          setLastUploadInfo({ count: parsed.length, label: "phone numbers" });
          setDataLoadedAt(new Date());
        } catch (e) {
          notifications.update({
            id: nId,
            title: "Sync failed",
            message: (e as Error).message,
            color: "red",
            loading: false,
            autoClose: 5000,
          });
          setError((e as Error).message);
          return;
        }

        await fetchFromSupabase();
      } else {
        setPhoneRecords(parsed);
        setPhoneCustomLoaded(true);
      }

      setError(null);
    } catch {
      setError("Failed to parse phone numbers CSV");
    }
  };

  const { signOut } = useAuth();

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

  if (loading) {
    return (
      <Box className="app-bg" style={{ minHeight: "100vh" }}>
        <Center style={{ minHeight: "100vh" }}>
          <Loader size="lg" />
        </Center>
      </Box>
    );
  }

  if (!session) {
    return <LoginPage />;
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
                {freshLabel && <span> &middot; {freshLabel}</span>}
                {supabaseLoading && <span> &middot; Syncing...</span>}
              </Text>
            </Group>

            <Group wrap="nowrap">
              {supabaseLoading ? (
                <Loader size="sm" />
              ) : joinedRecords.length > 0 ? (
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
                    {dbContactCount !== null && dbContactCount !== joinedRecords.length && (
                      <Text size="xs" c="dimmed" visibleFrom="sm">
                        (of {dbContactCount.toLocaleString()} in DB)
                      </Text>
                    )}
                    <Text size="xs" c="dimmed" visibleFrom="sm">
                      &middot; {phoneRecords.length.toLocaleString()} numbers
                    </Text>
                    {dbPhoneCount !== null && dbPhoneCount !== phoneRecords.length && (
                      <Text size="xs" c="dimmed" visibleFrom="sm">
                        (of {dbPhoneCount.toLocaleString()} in DB)
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
              <Tooltip label="Sign out">
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  radius="xl"
                  onClick={() => signOut()}
                >
                  <IconLogout size={18} />
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
