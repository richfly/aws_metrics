import Papa from 'papaparse'
import { ContactRecord, PhoneRecord } from '../types'

export function parseContactCsv(csvText: string): ContactRecord[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  return result.data.map((row) => ({
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
  })

  return result.data.map((row) => ({
    phoneNumber: row['Phone Number'] || '',
    description: (row['Description'] || '').trim(),
    phoneType: row['Phone Type'] || '',
    activeChannels: row['Active Channels'] || '',
    contactFlowIvr: (row['Contact flow/IVR'] || '').trim(),
    country: row['Country'] || '',
  }))
}
