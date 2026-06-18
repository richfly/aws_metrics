import Papa from 'papaparse'
import { ContactRecord, PhoneRecord } from '../types'

const CONTACT_REQUIRED_COLUMNS = [
  'Contact ID',
  'Initiation timestamp',
  'Queue',
  'Connected to agent timestamp',
  'Disconnect timestamp',
]

const PHONE_REQUIRED_COLUMNS = ['Phone Number', 'Description']

export class CsvParseError extends Error {
  readonly missingColumns: string[]
  readonly parseErrors: string[]

  constructor(missingColumns: string[], parseErrors: string[]) {
    const parts: string[] = []
    if (missingColumns.length > 0) {
      parts.push(`Missing required columns: ${missingColumns.join(', ')}`)
    }
    if (parseErrors.length > 0) {
      parts.push(`Parse errors: ${parseErrors.slice(0, 3).join('; ')}`)
    }
    super(parts.join('. '))
    this.name = 'CsvParseError'
    this.missingColumns = missingColumns
    this.parseErrors = parseErrors
  }
}

function validateColumns(
  headers: string[],
  required: string[],
): string[] {
  return required.filter((c) => !headers.includes(c))
}

export function parseContactCsv(csvText: string): ContactRecord[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  const headers = result.meta.fields ?? []
  const missing = validateColumns(headers, CONTACT_REQUIRED_COLUMNS)
  const errors = (result.errors ?? []).map((e) => `${e.row}: ${e.message}`)

  if (missing.length > 0 || errors.length > 5) {
    console.error('[csvParser] Contact CSV issues:', { missing, errors: errors.slice(0, 5) })
  }

  if (missing.length > 0) {
    throw new CsvParseError(missing, errors.slice(0, 3))
  }

  return result.data
    .filter((row) => Object.values(row).some((v) => v && String(v).trim() !== ''))
    .map((row) => ({
      contactId: row['Contact ID'] || '',
      channel: row['Channel'] || '',
      contactStatus: row['Contact status'] || '',
      initiationTimestamp: row['Initiation timestamp'] || '',
      systemPhoneNumber: row['System phone number'] || '',
      queue: row['Queue'] || '',
      agent: row['Agent'] || '',
      customerPhoneNumber: row['Customer phone number'] || '',
      disconnectTimestamp: row['Disconnect timestamp'] || '',
      contactDuration: row['Contact duration'] || '',
      routingProfile: row['Routing profile'] || '',
      connectedToAgentTimestamp: row['Connected to agent timestamp'] || '',
      scheduledTimestamp: row['Scheduled timestamp'] || '',
      enqueueTimestamp: row['Enqueue timestamp'] || '',
      acwStartTimestamp: row['ACW start timestamp'] || '',
      acwEndTimestamp: row['ACW end timestamp'] || '',
      agentInteractionDuration: row['Agent interaction duration'] || '',
      agentConnectionAttempts: row['Agent connection attempts'] || '',
      numberOfHolds: row['Number of holds'] || '',
      initiationMethod: row['Initiation method'] || '',
      disconnectReason: row['Disconnect reason'] || '',
      firstContactFlowName: row['First contact flow name'] || '',
      contactDirection: row['Contact direction'] || '',
      preferredAgents: row['Preferred agents'] || '',
      systemEmailAddress: row['System email address'] || '',
      customerEmailAddress: row['Customer email address'] || '',
    }))
}

export function parsePhoneCsv(csvText: string): PhoneRecord[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  const headers = result.meta.fields ?? []
  const missing = validateColumns(headers, PHONE_REQUIRED_COLUMNS)
  const errors = (result.errors ?? []).map((e) => `${e.row}: ${e.message}`)

  if (missing.length > 0 || errors.length > 5) {
    console.error('[csvParser] Phone CSV issues:', { missing, errors: errors.slice(0, 5) })
  }

  if (missing.length > 0) {
    throw new CsvParseError(missing, errors.slice(0, 3))
  }

  return result.data
    .filter((row) => Object.values(row).some((v) => v && String(v).trim() !== ''))
    .map((row) => ({
      phoneNumber: row['Phone Number'] || '',
      description: (row['Description'] || '').trim(),
      phoneType: row['Phone Type'] || '',
      activeChannels: row['Active Channels'] || '',
      contactFlowIvr: (row['Contact flow/IVR'] || '').trim(),
      country: row['Country'] || '',
    }))
}
