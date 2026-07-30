import type {
  AggregateCondition,
  AndOrCondition,
  AssignmentState,
  Condition,
  FieldCondition,
  GroupByField,
  NotCondition,
  NumericCondition,
  NumericField,
  TimeCondition,
} from '../types/review'
import type { ContactRecord } from '../types'
import { parseDate } from '../utils/metricsCalculator'

const WINDOW_MS: Record<string, number> = {
  minute: 60_000,
  hour:   3_600_000,
  day:    86_400_000,
}

export interface RunResult {
  perCall: ContactRecord[]
  perGroup: Map<string, ContactRecord[]>
}

export function runWorkflow(
  records: ContactRecord[],
  cond: Condition,
  granularity: 'per_call' | 'per_group',
  groupBy: GroupByField | null,
): RunResult {
  const matching = evaluateCondition(records, cond)
  const perCall = records.filter((r) => matching.has(r.contactId))

  const perGroup = new Map<string, ContactRecord[]>()
  if (granularity === 'per_group' && groupBy) {
    for (const r of perCall) {
      const key = r[groupBy] || '(empty)'
      const arr = perGroup.get(key) ?? []
      arr.push(r)
      perGroup.set(key, arr)
    }
  }

  return { perCall, perGroup }
}

function evaluateCondition(records: ContactRecord[], cond: Condition): Set<string> {
  switch (cond.type) {
    case 'and': return evaluateAnd(records, cond)
    case 'or':  return evaluateOr(records, cond)
    case 'not': return evaluateNot(records, cond)
    default:    return evaluateLeaf(records, cond)
  }
}

function evaluateAnd(records: ContactRecord[], cond: AndOrCondition): Set<string> {
  if (cond.children.length === 0) return new Set(records.map((r) => r.contactId))
  let acc: Set<string> | null = null
  for (const child of cond.children) {
    const set = evaluateCondition(records, child)
    acc = acc === null ? set : intersect(acc, set)
    if (acc.size === 0) return acc
  }
  return acc ?? new Set()
}

function evaluateOr(records: ContactRecord[], cond: AndOrCondition): Set<string> {
  if (cond.children.length === 0) return new Set()
  const acc = new Set<string>()
  for (const child of cond.children) {
    const set = evaluateCondition(records, child)
    for (const id of set) acc.add(id)
  }
  return acc
}

function evaluateNot(records: ContactRecord[], cond: NotCondition): Set<string> {
  const inner = evaluateCondition(records, cond.child)
  const out = new Set<string>()
  for (const r of records) if (!inner.has(r.contactId)) out.add(r.contactId)
  return out
}

function evaluateLeaf(records: ContactRecord[], cond: Condition): Set<string> {
  if (cond.type === 'field')     return evalField(records, cond)
  if (cond.type === 'numeric')   return evalNumeric(records, cond)
  if (cond.type === 'time')      return evalTime(records, cond)
  if (cond.type === 'aggregate') return evalAggregate(records, cond)
  return new Set()
}

function evalField(records: ContactRecord[], cond: FieldCondition): Set<string> {
  const out = new Set<string>()
  for (const r of records) {
    const fieldVal = r[cond.field] ?? ''
    if (matchesField(fieldVal, cond)) out.add(r.contactId)
  }
  return out
}

function matchesField(val: string, cond: FieldCondition): boolean {
  const v = (val ?? '').toString()
  switch (cond.op) {
    case 'eq':       return v === cond.value
    case 'neq':      return v !== cond.value
    case 'contains': return v.toLowerCase().includes(String(cond.value).toLowerCase())
    case 'in':       return Array.isArray(cond.value) && cond.value.includes(v)
    case 'not_in':   return Array.isArray(cond.value) && !cond.value.includes(v)
  }
}

function evalNumeric(records: ContactRecord[], cond: NumericCondition): Set<string> {
  const out = new Set<string>()
  for (const r of records) {
    const raw = Number(r[cond.field as NumericField])
    if (!Number.isFinite(raw)) continue
    if (matchesNumeric(raw, cond)) out.add(r.contactId)
  }
  return out
}

function matchesNumeric(n: number, cond: NumericCondition): boolean {
  switch (cond.op) {
    case 'gt': return typeof cond.value === 'number' && n > cond.value
    case 'lt': return typeof cond.value === 'number' && n < cond.value
    case 'gte': return typeof cond.value === 'number' && n >= cond.value
    case 'lte': return typeof cond.value === 'number' && n <= cond.value
    case 'between': {
      if (!Array.isArray(cond.value)) return false
      const [lo, hi] = cond.value
      return n >= lo && n <= hi
    }
  }
}

function evalTime(records: ContactRecord[], cond: TimeCondition): Set<string> {
  const out = new Set<string>()
  for (const r of records) {
    const d = parseDate(r.initiationTimestamp)
    if (!d) continue
    if (matchesTime(d, cond)) out.add(r.contactId)
  }
  return out
}

function matchesTime(d: Date, cond: TimeCondition): boolean {
  switch (cond.op) {
    case 'time_of_day': {
      const range = String(cond.value)
      const [from, to] = range.split('-').map((s) => s.trim())
      if (!from || !to) return false
      const minutes = d.getHours() * 60 + d.getMinutes()
      const [fh, fm] = from.split(':').map(Number)
      const [th, tm] = to.split(':').map(Number)
      const fromM = (fh ?? 0) * 60 + (fm ?? 0)
      const toM = (th ?? 0) * 60 + (tm ?? 0)
      return minutes >= fromM && minutes <= toM
    }
    case 'day_of_week': {
      const allowed = Array.isArray(cond.value) ? cond.value : []
      return allowed.includes(d.getDay())
    }
    case 'weekend':
      return d.getDay() === 0 || d.getDay() === 6
  }
}

function evalAggregate(records: ContactRecord[], cond: AggregateCondition): Set<string> {
  const index = buildGroupIndex(records, cond.group_by)
  const windowMs = WINDOW_MS[cond.window.unit] * cond.window.amount
  const out = new Set<string>()

  for (const [groupKey, sorted] of index) {
    if (sorted.length === 0) continue
    for (let i = 0; i < sorted.length; i++) {
      const anchor = sorted[i]
      const t = parseDate(anchor.initiationTimestamp)?.getTime()
      if (t === undefined) continue
      const tLo = t - windowMs
      const tHi = t + windowMs
      const inWindow = sorted.filter((r) => {
        const rt = parseDate(r.initiationTimestamp)?.getTime()
        return rt !== undefined && rt >= tLo && rt <= tHi
      })
      const value = computeAggregate(inWindow, cond)
      if (matchesAggregate(value, cond)) out.add(anchor.contactId)
    }
    void groupKey
  }
  return out
}

function buildGroupIndex(
  records: ContactRecord[],
  groupBy: GroupByField,
): Map<string, ContactRecord[]> {
  const m = new Map<string, ContactRecord[]>()
  for (const r of records) {
    const k = r[groupBy] || '(empty)'
    const arr = m.get(k) ?? []
    arr.push(r)
    m.set(k, arr)
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => {
      const ta = parseDate(a.initiationTimestamp)?.getTime() ?? 0
      const tb = parseDate(b.initiationTimestamp)?.getTime() ?? 0
      return ta - tb
    })
  }
  return m
}

function computeAggregate(records: ContactRecord[], cond: AggregateCondition): number {
  if (cond.agg === 'count') return records.length
  if (!cond.field) return records.length
  const nums: number[] = []
  for (const r of records) {
    const n = Number(r[cond.field as NumericField])
    if (Number.isFinite(n)) nums.push(n)
  }
  if (nums.length === 0) return 0
  if (cond.agg === 'avg') return nums.reduce((a, b) => a + b, 0) / nums.length
  if (cond.agg === 'min') return Math.min(...nums)
  if (cond.agg === 'max') return Math.max(...nums)
  return 0
}

function matchesAggregate(value: number, cond: AggregateCondition): boolean {
  switch (cond.op) {
    case 'eq':  return value === cond.value
    case 'neq': return value !== cond.value
    case 'gt':  return value > cond.value
    case 'lt':  return value < cond.value
    case 'gte': return value >= cond.value
    case 'lte': return value <= cond.value
  }
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  const out = new Set<string>()
  for (const id of a) if (b.has(id)) out.add(id)
  return out
}

export const ALL_STATES: AssignmentState[] = [
  'assigned', 'in_progress', 'completed', 'flagged', 'escalated',
]

export const TERMINAL_STATES: AssignmentState[] = ['completed', 'flagged', 'escalated']
