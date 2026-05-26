export interface ContactRecord {
  contactId: string
  channel: string
  contactStatus: string
  initiationTimestamp: string
  systemPhoneNumber: string
  queue: string
  agent: string
  customerPhoneNumber: string
  disconnectTimestamp: string
  contactDuration: string
  routingProfile: string
  connectedToAgentTimestamp: string
  scheduledTimestamp: string
  enqueueTimestamp: string
  acwStartTimestamp: string
  acwEndTimestamp: string
  agentInteractionDuration: string
  agentConnectionAttempts: string
  numberOfHolds: string
  initiationMethod: string
  disconnectReason: string
  firstContactFlowName: string
  contactDirection: string
  preferredAgents: string
  systemEmailAddress: string
  customerEmailAddress: string
  phoneDescription?: string
  phoneType?: string
  activeChannels?: string
  contactFlowIvr?: string
  country?: string
}

export interface PhoneRecord {
  phoneNumber: string
  description: string
  phoneType: string
  activeChannels: string
  contactFlowIvr: string
  country: string
}

export interface MetricStats {
  avg: number
  min: number
  max: number
  median: number
  count: number
}

export interface DetailedMetrics {
  agentConnectTime: MetricStats | null
  acwTime: MetricStats | null
  handleTime: MetricStats | null
}
