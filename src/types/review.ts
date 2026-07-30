export type AssignmentState =
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'flagged'
  | 'escalated'

export interface Reviewer {
  id: string
  name: string
  initials: string
  avatar_hue: number
  is_active: boolean
  created_at: string
}

export type ConditionType = 'field' | 'numeric' | 'time' | 'aggregate' | 'and' | 'or' | 'not'

export type FieldKey =
  | 'queue'
  | 'agent'
  | 'routingProfile'
  | 'phoneDescription'
  | 'channel'
  | 'initiationMethod'
  | 'contactStatus'
  | 'contactDirection'
  | 'disconnectReason'
  | 'firstContactFlowName'
  | 'country'
  | 'customerPhoneNumber'
  | 'systemPhoneNumber'

export type NumericField =
  | 'contactDuration'
  | 'agentInteractionDuration'
  | 'numberOfHolds'
  | 'agentConnectionAttempts'

export type FieldOp = 'eq' | 'neq' | 'contains' | 'in' | 'not_in'
export type NumericOp = 'gt' | 'lt' | 'gte' | 'lte' | 'between'
export type AggregateOp = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte'
export type AggregateFn = 'count' | 'avg' | 'min' | 'max'
export type GroupByField =
  | 'customerPhoneNumber'
  | 'agent'
  | 'queue'
  | 'systemPhoneNumber'
export type WindowUnit = 'minute' | 'hour' | 'day'
export type TimeOp = 'time_of_day' | 'day_of_week' | 'weekend'

export interface FieldCondition {
  type: 'field'
  field: FieldKey
  op: FieldOp
  value: string | string[]
}

export interface NumericCondition {
  type: 'numeric'
  field: NumericField
  op: NumericOp
  value: number | [number, number]
}

export interface TimeCondition {
  type: 'time'
  op: TimeOp
  value: string | number[] | boolean
}

export interface AggregateCondition {
  type: 'aggregate'
  agg: AggregateFn
  group_by: GroupByField
  field?: NumericField
  op: AggregateOp
  value: number
  window: { amount: number; unit: WindowUnit }
}

export interface AndOrCondition {
  type: 'and' | 'or'
  children: Condition[]
}

export interface NotCondition {
  type: 'not'
  child: Condition
}

export type Condition =
  | FieldCondition
  | NumericCondition
  | TimeCondition
  | AggregateCondition
  | AndOrCondition
  | NotCondition

export type WorkflowGranularity = 'per_call' | 'per_group'

export interface Workflow {
  id: string
  name: string
  description: string | null
  is_enabled: boolean
  granularity: WorkflowGranularity
  group_by: GroupByField | null
  conditions: Condition
  assign_to: string | null
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  workflow_id: string
  group_key: string
  contact_ids: string[]
  reviewer_id: string | null
  state: AssignmentState
  created_at: string
  updated_at: string
}

export interface AssignmentEvent {
  id: string
  assignment_id: string
  from_state: AssignmentState | null
  to_state: AssignmentState
  note: string | null
  actor_id: string | null
  created_at: string
}
