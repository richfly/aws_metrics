import { ContactRecord } from '../types'
import { parseDate, getShift, minutesDiff, secondsDiff } from './metricsCalculator'

export interface ColumnDef {
  id: string
  label: string
  group: string
  getValue: (record: ContactRecord) => string | number | boolean | null
  type: 'string' | 'seconds' | 'minutes' | 'boolean' | 'timestamp'
}

export const COLUMNS: ColumnDef[] = [
  { id: 'contactId', label: 'Contact ID', group: 'Identity', getValue: r => r.contactId, type: 'string' },
  { id: 'channel', label: 'Channel', group: 'Identity', getValue: r => r.channel, type: 'string' },
  { id: 'contactStatus', label: 'Status', group: 'Identity', getValue: r => r.contactStatus, type: 'string' },
  { id: 'contactDirection', label: 'Direction', group: 'Identity', getValue: r => r.contactDirection, type: 'string' },
  { id: 'initiationMethod', label: 'Init Method', group: 'Identity', getValue: r => r.initiationMethod, type: 'string' },

  { id: 'initiationTimestamp', label: 'Initiation', group: 'Timestamps', getValue: r => r.initiationTimestamp, type: 'timestamp' },
  { id: 'connectedToAgentTimestamp', label: 'Connected', group: 'Timestamps', getValue: r => r.connectedToAgentTimestamp, type: 'timestamp' },
  { id: 'disconnectTimestamp', label: 'Disconnect', group: 'Timestamps', getValue: r => r.disconnectTimestamp, type: 'timestamp' },
  { id: 'enqueueTimestamp', label: 'Enqueue', group: 'Timestamps', getValue: r => r.enqueueTimestamp, type: 'timestamp' },
  { id: 'acwStartTimestamp', label: 'ACW Start', group: 'Timestamps', getValue: r => r.acwStartTimestamp, type: 'timestamp' },
  { id: 'acwEndTimestamp', label: 'ACW End', group: 'Timestamps', getValue: r => r.acwEndTimestamp, type: 'timestamp' },
  { id: 'scheduledTimestamp', label: 'Scheduled', group: 'Timestamps', getValue: r => r.scheduledTimestamp, type: 'timestamp' },

  { id: 'agent', label: 'Agent', group: 'Agent', getValue: r => r.agent, type: 'string' },
  { id: 'routingProfile', label: 'Routing Profile', group: 'Agent', getValue: r => r.routingProfile, type: 'string' },
  { id: 'agentConnectionAttempts', label: 'Conn Attempts', group: 'Agent', getValue: r => r.agentConnectionAttempts, type: 'string' },
  { id: 'numberOfHolds', label: 'Holds', group: 'Agent', getValue: r => r.numberOfHolds, type: 'string' },

  { id: 'queue', label: 'Queue', group: 'Queue', getValue: r => r.queue, type: 'string' },
  { id: 'systemPhoneNumber', label: 'System Phone', group: 'Queue', getValue: r => r.systemPhoneNumber, type: 'string' },
  { id: 'customerPhoneNumber', label: 'Customer Phone', group: 'Queue', getValue: r => r.customerPhoneNumber, type: 'string' },
  { id: 'phoneDescription', label: 'Phone Desc', group: 'Queue', getValue: r => r.phoneDescription ?? null, type: 'string' },
  { id: 'phoneType', label: 'Phone Type', group: 'Queue', getValue: r => r.phoneType ?? null, type: 'string' },

  { id: 'contactDuration', label: 'Contact Duration', group: 'Duration', getValue: r => r.contactDuration, type: 'string' },
  { id: 'agentInteractionDuration', label: 'Interaction Duration', group: 'Duration', getValue: r => r.agentInteractionDuration, type: 'string' },

  { id: 'shift', label: 'Shift', group: 'Derived', getValue: r => {
    const d = parseDate(r.initiationTimestamp)
    return d ? getShift(d.getHours()) : null
  }, type: 'string' },
  { id: 'connectTime', label: 'Connect Time', group: 'Derived', getValue: r => secondsDiff(r.initiationTimestamp, r.connectedToAgentTimestamp), type: 'seconds' },
  { id: 'queueTime', label: 'Queue Time', group: 'Derived', getValue: r => r.connectedToAgentTimestamp ? secondsDiff(r.enqueueTimestamp, r.connectedToAgentTimestamp) : null, type: 'seconds' },
  { id: 'interactionTime', label: 'Interaction Time', group: 'Derived', getValue: r => minutesDiff(r.connectedToAgentTimestamp, r.disconnectTimestamp), type: 'minutes' },
  { id: 'acwTime', label: 'ACW Time', group: 'Derived', getValue: r => minutesDiff(r.acwStartTimestamp, r.acwEndTimestamp), type: 'minutes' },
  { id: 'totalDuration', label: 'Total Duration', group: 'Derived', getValue: r => minutesDiff(r.initiationTimestamp, r.disconnectTimestamp), type: 'minutes' },
  { id: 'sla20', label: 'SLA 20s', group: 'Derived', getValue: r => {
    const s = secondsDiff(r.initiationTimestamp, r.connectedToAgentTimestamp)
    return s !== null ? s <= 20 : null
  }, type: 'boolean' },
  { id: 'sla60', label: 'SLA 60s', group: 'Derived', getValue: r => {
    const s = secondsDiff(r.initiationTimestamp, r.connectedToAgentTimestamp)
    return s !== null ? s <= 60 : null
  }, type: 'boolean' },
  { id: 'isAbandoned', label: 'Abandoned', group: 'Derived', getValue: r => !r.connectedToAgentTimestamp, type: 'boolean' },

  { id: 'disconnectReason', label: 'Disconnect Reason', group: 'Other', getValue: r => r.disconnectReason, type: 'string' },
  { id: 'firstContactFlowName', label: 'Flow Name', group: 'Other', getValue: r => r.firstContactFlowName, type: 'string' },
  { id: 'preferredAgents', label: 'Preferred Agents', group: 'Other', getValue: r => r.preferredAgents, type: 'string' },
  { id: 'systemEmailAddress', label: 'System Email', group: 'Other', getValue: r => r.systemEmailAddress, type: 'string' },
  { id: 'customerEmailAddress', label: 'Customer Email', group: 'Other', getValue: r => r.customerEmailAddress, type: 'string' },
  { id: 'activeChannels', label: 'Active Channels', group: 'Other', getValue: r => r.activeChannels ?? null, type: 'string' },
  { id: 'contactFlowIvr', label: 'Flow IVR', group: 'Other', getValue: r => r.contactFlowIvr ?? null, type: 'string' },
  { id: 'country', label: 'Country', group: 'Other', getValue: r => r.country ?? null, type: 'string' },
]

export const DEFAULT_COLUMNS = [
  'contactId', 'initiationTimestamp', 'queue', 'agent', 'contactStatus',
  'shift', 'connectTime', 'interactionTime', 'acwTime', 'queueTime', 'sla20', 'isAbandoned',
]