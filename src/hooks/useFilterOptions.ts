import { useMemo } from 'react'
import { ContactRecord } from '../types'

export interface FilterOptions {
  routingProfileOptions: { value: string; label: string }[]
  queueOptions: { value: string; label: string }[]
  descriptionOptions: { value: string; label: string }[]
  initiationMethodOptions: { value: string; label: string }[]
}

function buildOptions(
  records: ContactRecord[],
  field: keyof ContactRecord,
): { value: string; label: string }[] {
  const values = new Set<string>()
  for (const r of records) {
    const v = r[field]
    if (v) values.add(String(v))
  }
  return Array.from(values)
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }))
}

export function useFilterOptions(joinedRecords: ContactRecord[]): FilterOptions {
  const routingProfileOptions = useMemo(
    () => buildOptions(joinedRecords, "routingProfile"),
    [joinedRecords],
  )
  const queueOptions = useMemo(
    () => buildOptions(joinedRecords, "queue"),
    [joinedRecords],
  )
  const descriptionOptions = useMemo(
    () => buildOptions(joinedRecords, "phoneDescription"),
    [joinedRecords],
  )
  const initiationMethodOptions = useMemo(
    () => buildOptions(joinedRecords, "initiationMethod"),
    [joinedRecords],
  )
  return {
    routingProfileOptions,
    queueOptions,
    descriptionOptions,
    initiationMethodOptions,
  }
}
