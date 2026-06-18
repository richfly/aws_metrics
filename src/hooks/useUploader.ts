import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { parseContactCsv, parsePhoneCsv } from '../utils/csvParser'
import { ContactRecord, PhoneRecord } from '../types'
import { toSnake } from './useDataLoader'
import { notifications } from '@mantine/notifications'

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
]

const PHONE_FIELDS: [keyof PhoneRecord, string][] = [
  ["phoneNumber", "phone_number"],
  ["description", "description"],
  ["phoneType", "phone_type"],
  ["activeChannels", "active_channels"],
  ["contactFlowIvr", "contact_flow_ivr"],
  ["country", "country"],
]

async function upsertBatched(
  table: "contacts" | "phone_records",
  rows: Record<string, string>[],
  onConflict: string,
  notifyId: string,
  label: string,
  batchSize = 1000,
): Promise<void> {
  const totalBatches = Math.ceil(rows.length / batchSize)
  for (let i = 0; i < rows.length; i += batchSize) {
    const batchNum = i / batchSize + 1
    const chunk = rows.slice(i, i + batchSize)
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict })
    if (error) {
      throw new Error(`Batch ${batchNum} / ${totalBatches} failed: ${error.message}`)
    }
    notifications.update({
      id: notifyId,
      message: `${batchNum} / ${totalBatches} batches (${label})`,
      loading: true,
    })
  }
}

export interface UploaderCallbacks {
  onUploadSuccess: (info: { count: number; label: string }) => void
  setError: (err: string) => void
  clearFilterState: () => void
  setContactRecords: (records: ContactRecord[]) => void
  setPhoneRecords: (records: PhoneRecord[]) => void
  setPhoneCustomLoaded: (loaded: boolean) => void
  setDataLoadedAt: (date: Date | null) => void
}

export interface UploaderDeps {
  session: unknown
  hasSupabase: boolean
  fetch: () => Promise<void>
}

export function useUploader(deps: UploaderDeps, callbacks: UploaderCallbacks) {
  const { session, hasSupabase, fetch } = deps
  const {
    onUploadSuccess,
    setError,
    clearFilterState,
    setContactRecords,
    setPhoneRecords,
    setPhoneCustomLoaded,
    setDataLoadedAt,
  } = callbacks

  const handleContactsUpload = useCallback(
    async (text: string) => {
      try {
        const parsed = parseContactCsv(text)
        if (parsed.length === 0) {
          setError("No records found in contacts CSV")
          return
        }

        if (session && hasSupabase) {
          const snakeData = parsed.map(
            (r) => toSnake(r as unknown as Record<string, string>, CONTACT_FIELDS),
          )
          const nId = notifications.show({
            title: "Syncing contacts",
            message: "Starting upload...",
            loading: true,
            autoClose: false,
            withCloseButton: false,
          })
          try {
            await upsertBatched("contacts", snakeData, "contact_id", nId, "contacts")
            notifications.update({
              id: nId,
              title: "Contacts synced",
              message: `${parsed.length.toLocaleString()} records uploaded`,
              color: "teal",
              loading: false,
              autoClose: 3000,
            })
            onUploadSuccess({ count: parsed.length, label: "contacts" })
            setDataLoadedAt(new Date())
          } catch (e) {
            notifications.update({
              id: nId,
              title: "Sync failed",
              message: (e as Error).message,
              color: "red",
              loading: false,
              autoClose: 5000,
            })
            setError((e as Error).message)
            return
          }
          await fetch()
        } else {
          setContactRecords(parsed)
          setDataLoadedAt(new Date())
        }

        clearFilterState()
        setError("")
      } catch (err) {
        console.error("[upload] contacts parse failed:", err)
        setError((err as Error).message || "Failed to parse contacts CSV")
      }
    },
    [session, hasSupabase, fetch, onUploadSuccess, setError, clearFilterState, setContactRecords, setDataLoadedAt],
  )

  const handlePhonesUpload = useCallback(
    async (text: string) => {
      try {
        const parsed = parsePhoneCsv(text)
        if (parsed.length === 0) {
          setError("No phone numbers found in CSV")
          return
        }

        if (session && hasSupabase) {
          const snakeData = parsed.map(
            (r) => toSnake(r as unknown as Record<string, string>, PHONE_FIELDS),
          )
          const nId = notifications.show({
            title: "Syncing phone numbers",
            message: "Starting upload...",
            loading: true,
            autoClose: false,
            withCloseButton: false,
          })
          try {
            await upsertBatched("phone_records", snakeData, "phone_number", nId, "phone numbers")
            notifications.update({
              id: nId,
              title: "Phone numbers synced",
              message: `${parsed.length.toLocaleString()} numbers uploaded`,
              color: "teal",
              loading: false,
              autoClose: 3000,
            })
            onUploadSuccess({ count: parsed.length, label: "phone numbers" })
            setDataLoadedAt(new Date())
          } catch (e) {
            notifications.update({
              id: nId,
              title: "Sync failed",
              message: (e as Error).message,
              color: "red",
              loading: false,
              autoClose: 5000,
            })
            setError((e as Error).message)
            return
          }
          await fetch()
        } else {
          setPhoneRecords(parsed)
          setPhoneCustomLoaded(true)
        }

        setError("")
      } catch (err) {
        console.error("[upload] phones parse failed:", err)
        setError((err as Error).message || "Failed to parse phone numbers CSV")
      }
    },
    [session, hasSupabase, fetch, onUploadSuccess, setError, setPhoneRecords, setPhoneCustomLoaded, setDataLoadedAt],
  )

  return { handleContactsUpload, handlePhonesUpload }
}
