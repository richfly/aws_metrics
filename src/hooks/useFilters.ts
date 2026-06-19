import { useState, useMemo, useCallback, useDeferredValue } from 'react'
import { ContactRecord } from '../types'
import { calculateMetrics, parseDate } from '../utils/metricsCalculator'

export interface FiltersState {
  routingProfileFilter: string[]
  queueFilter: string[]
  descriptionFilter: string[]
  initiationMethodFilter: string[]
  dateRange: [Date | null, Date | null]
  dateMode: "single" | "range"
  setRoutingProfileFilter: (v: string[]) => void
  setQueueFilter: (v: string[]) => void
  setDescriptionFilter: (v: string[]) => void
  setInitiationMethodFilter: (v: string[]) => void
  setDateRange: (v: [Date | null, Date | null]) => void
  setDateMode: (v: "single" | "range") => void
  clearFilters: () => void
  hasFilter: boolean
  filteredRecords: ContactRecord[]
  deferredFilteredRecords: ContactRecord[]
  filterLabel: string
  metrics: ReturnType<typeof calculateMetrics> | null
}

export interface FilterOptions {
  routingProfileOptions: { value: string; label: string }[]
  queueOptions: { value: string; label: string }[]
  descriptionOptions: { value: string; label: string }[]
  initiationMethodOptions: { value: string; label: string }[]
}

export function useFilters(joinedRecords: ContactRecord[]): FiltersState {
  const [routingProfileFilter, setRoutingProfileFilter] = useState<string[]>([])
  const [queueFilter, setQueueFilter] = useState<string[]>([])
  const [descriptionFilter, setDescriptionFilter] = useState<string[]>([])
  const [initiationMethodFilter, setInitiationMethodFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [dateMode, setDateMode] = useState<"single" | "range">("range")

  const routingProfileSet = useMemo(() => new Set(routingProfileFilter), [routingProfileFilter])
  const queueFilterSet = useMemo(() => new Set(queueFilter), [queueFilter])
  const descriptionFilterSet = useMemo(() => new Set(descriptionFilter), [descriptionFilter])
  const initiationMethodSet = useMemo(() => new Set(initiationMethodFilter), [initiationMethodFilter])

  const filteredRecords = useMemo(() => {
    let records = joinedRecords
    if (dateRange[0]) {
      records = records.filter((r) => {
        const d = parseDate(r.initiationTimestamp)
        return d && d >= dateRange[0]!
      })
    }
    if (dateRange[1]) {
      const end = new Date(dateRange[1].getTime() + 86400000)
      records = records.filter((r) => {
        const d = parseDate(r.initiationTimestamp)
        return d && d < end
      })
    }
    if (routingProfileSet.size > 0) {
      records = records.filter(r => r.routingProfile && routingProfileSet.has(r.routingProfile))
    }
    if (queueFilterSet.size > 0) {
      records = records.filter(r => r.queue && queueFilterSet.has(r.queue))
    }
    if (descriptionFilterSet.size > 0) {
      records = records.filter(r => r.phoneDescription && descriptionFilterSet.has(r.phoneDescription))
    }
    if (initiationMethodSet.size > 0) {
      records = records.filter(r => r.initiationMethod && initiationMethodSet.has(r.initiationMethod))
    }
    return records
  }, [
    joinedRecords,
    dateRange,
    routingProfileSet,
    queueFilterSet,
    descriptionFilterSet,
    initiationMethodSet,
  ])

  const deferredFilteredRecords = useDeferredValue(filteredRecords)

  const metrics = useMemo(
    () => (deferredFilteredRecords.length > 0 ? calculateMetrics(deferredFilteredRecords) : null),
    [deferredFilteredRecords],
  )

  const clearFilters = useCallback(() => {
    setRoutingProfileFilter([])
    setQueueFilter([])
    setDescriptionFilter([])
    setInitiationMethodFilter([])
    setDateRange([null, null])
  }, [])

  const hasFilter =
    !!(dateRange[0] || dateRange[1]) ||
    routingProfileFilter.length > 0 ||
    queueFilter.length > 0 ||
    descriptionFilter.length > 0 ||
    initiationMethodFilter.length > 0

  const filterLabel = useMemo(() => {
    const parts: string[] = []
    if (dateRange[0] && dateRange[1]) {
      parts.push(`${dateRange[0].toLocaleDateString()} – ${dateRange[1].toLocaleDateString()}`)
    } else if (dateRange[0]) {
      parts.push(`From ${dateRange[0].toLocaleDateString()}`)
    } else if (dateRange[1]) {
      parts.push(`To ${dateRange[1].toLocaleDateString()}`)
    }
    if (routingProfileFilter.length > 0) {
      parts.push(`Routing Profile: ${routingProfileFilter.join(', ')}`)
    }
    if (queueFilter.length > 0) {
      parts.push(`Queue: ${queueFilter.join(', ')}`)
    }
    if (initiationMethodFilter.length > 0) {
      parts.push(`Initiation: ${initiationMethodFilter.join(', ')}`)
    }
    if (descriptionFilter.length > 0) {
      parts.push(`Description: ${descriptionFilter.join(', ')}`)
    }
    return parts.join(", ")
  }, [dateRange, routingProfileFilter, queueFilter, initiationMethodFilter, descriptionFilter])

  return {
    routingProfileFilter,
    queueFilter,
    descriptionFilter,
    initiationMethodFilter,
    dateRange,
    dateMode,
    setRoutingProfileFilter,
    setQueueFilter,
    setDescriptionFilter,
    setInitiationMethodFilter,
    setDateRange,
    setDateMode,
    clearFilters,
    hasFilter,
    filteredRecords,
    deferredFilteredRecords,
    filterLabel,
    metrics,
  }
}