import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { ContactRecord, PhoneRecord } from '../types'
import { joinData } from '../utils/dataJoiner'
import { clearDateCache } from '../utils/metricsCalculator'

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
]

const PHONE_FIELDS: [keyof PhoneRecord, string][] = [
  ["phoneNumber", "phone_number"],
  ["description", "description"],
  ["phoneType", "phone_type"],
  ["activeChannels", "active_channels"],
  ["contactFlowIvr", "contact_flow_ivr"],
  ["country", "country"],
]

export function toSnake(record: Record<string, string>, fields: [string, string][]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [camel, snake] of fields) {
    if (record[camel] !== undefined) out[snake] = record[camel]
  }
  return out
}

export function toCamel(row: Record<string, unknown>, fields: [string, string][]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [camel, snake] of fields) {
    const val = row[snake]
    out[camel] = val != null ? String(val) : ""
  }
  return out
}

export interface DataLoaderState {
  contactRecords: ContactRecord[]
  phoneRecords: PhoneRecord[]
  dbContactCount: number | null
  dbPhoneCount: number | null
  phoneCustomLoaded: boolean
  dataLoadedAt: Date | null
  supabaseLoading: boolean
  lastSyncedAt: Date | null
  loadingProgress: { loaded: number; total: number | null } | null
  joinedRecords: ContactRecord[]
  fetch: (options?: { silent?: boolean }) => Promise<void>
  setContactRecords: (records: ContactRecord[]) => void
  setPhoneRecords: (records: PhoneRecord[]) => void
  setPhoneCustomLoaded: (loaded: boolean) => void
  setDataLoadedAt: (date: Date | null) => void
  setSupabaseLoading: (loading: boolean) => void
}

const PAGE_SIZE = 1000

export function useDataLoader(session: unknown): DataLoaderState {
  const [contactRecords, setContactRecords] = useState<ContactRecord[]>([])
  const [phoneRecords, setPhoneRecords] = useState<PhoneRecord[]>([])
  const [dbContactCount, setDbContactCount] = useState<number | null>(null)
  const [dbPhoneCount, setDbPhoneCount] = useState<number | null>(null)
  const [phoneCustomLoaded, setPhoneCustomLoaded] = useState(false)
  const [dataLoadedAt, setDataLoadedAt] = useState<Date | null>(null)
  const [supabaseLoading, setSupabaseLoading] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number | null } | null>(null)
  const realtimeDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isFetching = useRef(false)
  const lastFetchCompletedAt = useRef<number>(0)

  const fetchFromSupabase = useCallback(async (options?: { silent?: boolean }) => {
    if (isFetching.current) {
      console.log("[fetch] skipped — already in progress")
      return
    }
    isFetching.current = true
    if (!options?.silent) {
      setSupabaseLoading(true)
      console.time("[fetch] full load")
      console.time("[fetch] contacts count query")
    }
    setLoadingProgress({ loaded: 0, total: null })
    try {
      const contactsCountResult = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
      if (!options?.silent) console.timeEnd("[fetch] contacts count query")
      const totalContacts = contactsCountResult.count ?? 0
      const totalPages = Math.ceil(totalContacts / PAGE_SIZE)
      if (!options?.silent) {
        console.log(`[fetch] ${totalContacts} contacts, ${totalPages} pages of ${PAGE_SIZE}`)
      }

      setDbContactCount(totalContacts)
      setLoadingProgress({ loaded: 0, total: totalContacts })

      const fetchContactsParallel = async (): Promise<Record<string, unknown>[]> => {
        if (totalPages === 0) return []
        if (!options?.silent) console.time("[fetch] contacts pages (parallel)")
        const pagePromises = Array.from({ length: totalPages }, (_, i) =>
          supabase
            .from("contacts")
            .select("*")
            .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1),
        )
        const results = await Promise.all(pagePromises)
        if (!options?.silent) console.timeEnd("[fetch] contacts pages (parallel)")
        const all: Record<string, unknown>[] = []
        const allMapped: ContactRecord[] = []
        for (const { data, error } of results) {
          if (error) throw error
          if (!data || data.length === 0) continue
          all.push(...(data as Record<string, unknown>[]))
          allMapped.push(...data.map(
            (r) => toCamel(r, CONTACT_FIELDS) as unknown as ContactRecord,
          ))
        }
        setContactRecords(allMapped)
        setLoadingProgress({ loaded: all.length, total: totalContacts })
        clearDateCache()
        return all
      }

      const fetchAllPhones = async (): Promise<Record<string, unknown>[]> => {
        const all: Record<string, unknown>[] = []
        let from = 0
        while (true) {
          const { data, error } = await supabase
            .from("phone_records")
            .select("*")
            .range(from, from + PAGE_SIZE - 1)
          if (error) throw error
          if (!data || data.length === 0) break
          all.push(...(data as Record<string, unknown>[]))
          if (data.length < PAGE_SIZE) break
          from += PAGE_SIZE
        }
        return all
      }

      if (!options?.silent) console.time("[fetch] all queries (Promise.all)")
      const [contactsAll, phonesAll, phonesCountResult] = await Promise.all([
        fetchContactsParallel(),
        fetchAllPhones(),
        supabase.from("phone_records").select("*", { count: "exact", head: true }),
      ])
      if (!options?.silent) console.timeEnd("[fetch] all queries (Promise.all)")

      if (typeof phonesCountResult.count === "number") {
        setDbPhoneCount(phonesCountResult.count)
      }

      const mappedPhones = phonesAll.map(
        (r) => toCamel(r, PHONE_FIELDS) as unknown as PhoneRecord,
      )
      setPhoneRecords(mappedPhones)
      if (mappedPhones.length > 0) setPhoneCustomLoaded(true)

      if (contactsAll.length > 0) {
        setDataLoadedAt(new Date())
        setLastSyncedAt(new Date())
      }
      lastFetchCompletedAt.current = Date.now()
      if (!options?.silent) {
        console.timeEnd("[fetch] full load")
        console.log(
          `[fetch] loaded ${contactsAll.length} contacts + ${phonesAll.length} phones`,
        )
      }
    } catch (err) {
      console.error("[fetch] Supabase load failed:", err)
      throw err
    } finally {
      setLoadingProgress(null)
      if (!options?.silent) setSupabaseLoading(false)
      isFetching.current = false
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchFromSupabase().catch((err) => {
        console.error("[fetch] initial load failed:", err)
      })
    }
  }, [session, fetchFromSupabase])

  useEffect(() => {
    if (!session) return

    const handleChange = () => {
      if (realtimeDebounce.current) clearTimeout(realtimeDebounce.current)
      realtimeDebounce.current = setTimeout(() => {
        // Skip if a user-initiated fetch (e.g., upload) just completed,
        // or one is already in progress.
        const sinceLastFetch = Date.now() - lastFetchCompletedAt.current
        if (isFetching.current) {
          console.log("[realtime] skipped — fetch in progress")
          return
        }
        if (sinceLastFetch < 3000) {
          console.log(`[realtime] skipped — user fetch just completed (${sinceLastFetch}ms ago)`)
          return
        }
        fetchFromSupabase({ silent: true }).catch((err) => {
          console.error("[realtime] refetch failed:", err)
        })
      }, 2000)
    }

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
      .subscribe()

    return () => {
      if (realtimeDebounce.current) clearTimeout(realtimeDebounce.current)
      supabase.removeChannel(channel)
    }
  }, [session, fetchFromSupabase])

  const joinedRecords = useMemo(
    () => contactRecords.length > 0 ? joinData(contactRecords, phoneRecords) : [],
    [contactRecords, phoneRecords]
  )

  return {
    contactRecords,
    phoneRecords,
    dbContactCount,
    dbPhoneCount,
    phoneCustomLoaded,
    dataLoadedAt,
    supabaseLoading,
    lastSyncedAt,
    loadingProgress,
    joinedRecords,
    fetch: fetchFromSupabase,
    setContactRecords,
    setPhoneRecords,
    setPhoneCustomLoaded,
    setDataLoadedAt,
    setSupabaseLoading,
  }
}
