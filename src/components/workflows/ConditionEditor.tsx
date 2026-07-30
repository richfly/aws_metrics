import { Box, Group, NativeSelect, NumberInput, TextInput, MultiSelect, Stack, ActionIcon, Tooltip, Text, SegmentedControl, Button, Code, Divider } from '@mantine/core'
import { IconPlus, IconTrash, IconCopy, IconBraces, IconArrowsJoin, IconArrowBack } from '@tabler/icons-react'
import type {
  AggregateCondition,
  AggregateFn,
  Condition,
  FieldCondition,
  FieldKey,
  FieldOp,
  GroupByField,
  NumericCondition,
  NumericField,
  NumericOp,
  TimeCondition,
  TimeOp,
  WindowUnit,
} from '../../types/review'
import type { ContactRecord } from '../../types'

const FIELD_OPTIONS: Array<{ value: FieldKey; label: string }> = [
  { value: 'queue',              label: 'Queue' },
  { value: 'agent',              label: 'Agent' },
  { value: 'routingProfile',     label: 'Routing Profile' },
  { value: 'phoneDescription',   label: 'Phone Description' },
  { value: 'channel',            label: 'Channel' },
  { value: 'initiationMethod',   label: 'Initiation Method' },
  { value: 'contactStatus',      label: 'Contact Status' },
  { value: 'contactDirection',   label: 'Direction' },
  { value: 'disconnectReason',   label: 'Disconnect Reason' },
  { value: 'firstContactFlowName', label: 'First Contact Flow' },
  { value: 'country',            label: 'Country' },
  { value: 'customerPhoneNumber', label: 'Customer Phone' },
  { value: 'systemPhoneNumber',  label: 'System Phone' },
]

const NUMERIC_FIELD_OPTIONS: Array<{ value: NumericField; label: string }> = [
  { value: 'contactDuration',           label: 'Contact Duration (s)' },
  { value: 'agentInteractionDuration',  label: 'Agent Interaction (s)' },
  { value: 'numberOfHolds',             label: 'Number of Holds' },
  { value: 'agentConnectionAttempts',   label: 'Connection Attempts' },
]

const FIELD_OP_OPTIONS: Array<{ value: FieldOp; label: string }> = [
  { value: 'eq',       label: '=' },
  { value: 'neq',      label: '≠' },
  { value: 'contains', label: 'contains' },
  { value: 'in',       label: 'in' },
  { value: 'not_in',   label: 'not in' },
]

const NUMERIC_OP_OPTIONS: Array<{ value: NumericOp; label: string }> = [
  { value: 'gt',     label: '>' },
  { value: 'lt',     label: '<' },
  { value: 'gte',    label: '≥' },
  { value: 'lte',    label: '≤' },
  { value: 'between', label: 'between' },
]

const GROUP_BY_OPTIONS: Array<{ value: GroupByField; label: string }> = [
  { value: 'customerPhoneNumber', label: 'Customer Phone' },
  { value: 'agent',               label: 'Agent' },
  { value: 'queue',               label: 'Queue' },
  { value: 'systemPhoneNumber',   label: 'System Phone' },
]

const AGG_OPTIONS: Array<{ value: AggregateFn; label: string }> = [
  { value: 'count', label: 'count' },
  { value: 'avg',   label: 'avg' },
  { value: 'min',   label: 'min' },
  { value: 'max',   label: 'max' },
]

const WINDOW_UNIT_OPTIONS: Array<{ value: WindowUnit; label: string }> = [
  { value: 'minute', label: 'min' },
  { value: 'hour',   label: 'hr' },
  { value: 'day',    label: 'day' },
]

const TIME_OP_OPTIONS: Array<{ value: TimeOp; label: string }> = [
  { value: 'time_of_day', label: 'Time of day' },
  { value: 'day_of_week', label: 'Day of week' },
  { value: 'weekend',     label: 'Weekend only' },
]

const DAY_OPTIONS = [
  { value: '0', label: 'Sun' },
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
]

interface NodeProps {
  cond: Condition
  onChange: (c: Condition) => void
  onDelete?: () => void
  depth?: number
}

export function ConditionNode({ cond, onChange, onDelete, depth = 0 }: NodeProps) {
  return (
    <Box
      style={{
        borderLeft: depth > 0 ? '2px solid var(--mantine-color-default-border)' : 'none',
        paddingLeft: depth > 0 ? 12 : 0,
        marginTop: 4,
      }}
    >
      <Group justify="space-between" wrap="nowrap" mb={4}>
        <TypeSelector cond={cond} onChange={onChange} />
        <Group gap={4} wrap="nowrap">
          <Tooltip label="Duplicate condition">
            <ActionIcon variant="subtle" color="gray" size="sm"
              onClick={() => onChange({ ...cond } as Condition)}
            >
              <IconCopy size={14} />
            </ActionIcon>
          </Tooltip>
          {onDelete && (
            <Tooltip label="Delete condition">
              <ActionIcon variant="subtle" color="red" size="sm" onClick={onDelete}>
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>
      <ConditionBody cond={cond} onChange={onChange} depth={depth} />
    </Box>
  )
}

function TypeSelector({ cond, onChange }: { cond: Condition; onChange: (c: Condition) => void }) {
  const type = cond.type
  return (
    <Group gap={6} wrap="nowrap">
      <Text size="xs" c="dimmed">where</Text>
      <NativeSelect
        size="xs"
        value={type}
        data={[
          { value: 'field',     label: 'field' },
          { value: 'numeric',   label: 'numeric' },
          { value: 'time',      label: 'time' },
          { value: 'aggregate', label: 'aggregate' },
        ]}
        onChange={(e) => onChange(upgradeType(cond, e.currentTarget.value as any))}
      />
    </Group>
  )
}

function upgradeType(cond: Condition, newType: Condition['type']): Condition {
  if (cond.type === newType) return cond
  if (newType === 'field')     return { type: 'field', field: 'queue', op: 'eq', value: '' }
  if (newType === 'numeric')   return { type: 'numeric', field: 'contactDuration', op: 'gt', value: 0 }
  if (newType === 'time')      return { type: 'time', op: 'time_of_day', value: '09:00-17:00' }
  if (newType === 'aggregate') return {
    type: 'aggregate', agg: 'count', group_by: 'customerPhoneNumber',
    op: 'gte', value: 3, window: { amount: 60, unit: 'minute' },
  }
  return cond
}

function ConditionBody({ cond, onChange, depth }: NodeProps) {
  if (cond.type === 'field')     return <FieldEditor cond={cond} onChange={onChange} />
  if (cond.type === 'numeric')   return <NumericEditor cond={cond} onChange={onChange} />
  if (cond.type === 'time')      return <TimeEditor cond={cond} onChange={onChange} />
  if (cond.type === 'aggregate') return <AggregateEditor cond={cond} onChange={onChange} />
  return null
}

function FieldEditor({ cond, onChange }: { cond: FieldCondition; onChange: (c: Condition) => void }) {
  const needsMulti = cond.op === 'in' || cond.op === 'not_in'
  return (
    <Group gap={6} wrap="wrap" align="end">
      <NativeSelect
        size="xs" label="Field" w={170}
        value={cond.field}
        data={FIELD_OPTIONS}
        onChange={(e) => onChange({ ...cond, field: e.currentTarget.value as FieldKey })}
      />
      <NativeSelect
        size="xs" label="Op" w={110}
        value={cond.op}
        data={FIELD_OP_OPTIONS}
        onChange={(e) => onChange({ ...cond, op: e.currentTarget.value as FieldOp })}
      />
      {needsMulti ? (
        <MultiSelect
          size="xs" label="Values" w={260}
          data={String(cond.value ?? '').split(',').filter(Boolean).map((v) => ({ value: v, label: v }))}
          value={Array.isArray(cond.value) ? cond.value : []}
          searchable clearable
          onChange={(vals) => onChange({ ...cond, value: vals })}
          placeholder="Type and press enter"
        />
      ) : (
        <TextInput
          size="xs" label="Value" w={220}
          value={String(cond.value ?? '')}
          onChange={(e) => onChange({ ...cond, value: e.currentTarget.value })}
        />
      )}
    </Group>
  )
}

function NumericEditor({ cond, onChange }: { cond: NumericCondition; onChange: (c: Condition) => void }) {
  const isBetween = cond.op === 'between'
  return (
    <Group gap={6} wrap="wrap" align="end">
      <NativeSelect
        size="xs" label="Field" w={210}
        value={cond.field}
        data={NUMERIC_FIELD_OPTIONS}
        onChange={(e) => onChange({ ...cond, field: e.currentTarget.value as NumericField })}
      />
      <NativeSelect
        size="xs" label="Op" w={100}
        value={cond.op}
        data={NUMERIC_OP_OPTIONS}
        onChange={(e) => {
          const op = e.currentTarget.value as NumericOp
          onChange({ ...cond, op, value: op === 'between' ? [0, 0] : 0 })
        }}
      />
      {isBetween ? (
        <Group gap={4} align="end">
          <NumberInput
            size="xs" label="Min" w={110}
            value={Array.isArray(cond.value) ? cond.value[0] : 0}
            onChange={(v) => onChange({ ...cond, value: [Number(v) || 0, Array.isArray(cond.value) ? cond.value[1] : 0] })}
          />
          <NumberInput
            size="xs" label="Max" w={110}
            value={Array.isArray(cond.value) ? cond.value[1] : 0}
            onChange={(v) => onChange({ ...cond, value: [Array.isArray(cond.value) ? cond.value[0] : 0, Number(v) || 0] })}
          />
        </Group>
      ) : (
        <NumberInput
          size="xs" label="Value" w={130}
          value={typeof cond.value === 'number' ? cond.value : 0}
          onChange={(v) => onChange({ ...cond, value: Number(v) || 0 })}
        />
      )}
    </Group>
  )
}

function TimeEditor({ cond, onChange }: { cond: TimeCondition; onChange: (c: Condition) => void }) {
  return (
    <Group gap={6} wrap="wrap" align="end">
      <NativeSelect
        size="xs" label="Op" w={160}
        value={cond.op}
        data={TIME_OP_OPTIONS}
        onChange={(e) => onChange({ ...cond, op: e.currentTarget.value as TimeOp })}
      />
      {cond.op === 'time_of_day' && (
        <TextInput
          size="xs" label="Range (HH:MM-HH:MM)" w={200}
          value={String(cond.value ?? '')}
          onChange={(e) => onChange({ ...cond, value: e.currentTarget.value })}
          placeholder="09:00-17:00"
        />
      )}
      {cond.op === 'day_of_week' && (
        <MultiSelect
          size="xs" label="Days" w={260}
          data={DAY_OPTIONS}
          value={Array.isArray(cond.value) ? cond.value.map(String) : []}
          onChange={(vals) => onChange({ ...cond, value: vals.map(Number) })}
        />
      )}
    </Group>
  )
}

function AggregateEditor({ cond, onChange }: { cond: AggregateCondition; onChange: (c: Condition) => void }) {
  const needsField = cond.agg !== 'count'
  return (
    <Stack gap={4}>
      <Group gap={6} wrap="wrap" align="end">
        <NativeSelect
          size="xs" label="Agg" w={90}
          value={cond.agg}
          data={AGG_OPTIONS}
          onChange={(e) => onChange({ ...cond, agg: e.currentTarget.value as AggregateFn })}
        />
        <Text size="xs" c="dimmed">of</Text>
        {needsField && (
          <NativeSelect
            size="xs" label="Field" w={210}
            value={cond.field ?? 'contactDuration'}
            data={NUMERIC_FIELD_OPTIONS}
            onChange={(e) => onChange({ ...cond, field: e.currentTarget.value as NumericField })}
          />
        )}
        <Text size="xs" c="dimmed">per</Text>
        <NativeSelect
          size="xs" label="Group by" w={170}
          value={cond.group_by}
          data={GROUP_BY_OPTIONS}
          onChange={(e) => onChange({ ...cond, group_by: e.currentTarget.value as GroupByField })}
        />
        <Text size="xs" c="dimmed">in last</Text>
        <NumberInput
          size="xs" label="Window" w={90}
          value={cond.window.amount}
          min={1}
          onChange={(v) => onChange({ ...cond, window: { ...cond.window, amount: Number(v) || 1 } })}
        />
        <NativeSelect
          size="xs" label="Unit" w={90}
          value={cond.window.unit}
          data={WINDOW_UNIT_OPTIONS}
          onChange={(e) => onChange({ ...cond, window: { ...cond.window, unit: e.currentTarget.value as WindowUnit } })}
        />
      </Group>
      <Group gap={6} wrap="wrap" align="end">
        <NativeSelect
          size="xs" label="Compare" w={100}
          value={cond.op}
          data={NUMERIC_OP_OPTIONS.filter((o) => o.value !== 'between')}
          onChange={(e) => onChange({ ...cond, op: e.currentTarget.value as AggregateCondition['op'] })}
        />
        <NumberInput
          size="xs" label="Value" w={130}
          value={cond.value}
          onChange={(v) => onChange({ ...cond, value: Number(v) || 0 })}
        />
        <Text size="xs" c="dimmed">
          (i.e. <Code>{`${cond.agg}(${cond.agg === 'count' ? '*' : cond.field ?? ''})`}</Code> per <Code>{cond.group_by}</Code> within ±{cond.window.amount} {cond.window.unit})
        </Text>
      </Group>
    </Stack>
  )
}

export function ConditionGroup({
  cond,
  onChange,
  onDelete,
  records,
}: {
  cond: Extract<Condition, { type: 'and' | 'or' }>
  onChange: (c: Condition) => void
  onDelete: () => void
  records: ContactRecord[]
}) {
  const addChild = (c: Condition) =>
    onChange({ ...cond, children: [...cond.children, c] })
  const updateChild = (i: number, c: Condition) =>
    onChange({ ...cond, children: cond.children.map((x, j) => (i === j ? c : x)) })
  const removeChild = (i: number) =>
    onChange({ ...cond, children: cond.children.filter((_, j) => j !== i) })

  return (
    <Box
      style={{
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        padding: 10,
        background: 'var(--mantine-color-default-hover)',
      }}
    >
      <Group justify="space-between" mb={6} wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          <IconArrowsJoin size={14} />
          <SegmentedControl
            size="xs"
            value={cond.type}
            data={[{ value: 'and', label: 'ALL of' }, { value: 'or', label: 'ANY of' }]}
            onChange={(v) => onChange({ ...cond, type: v as 'and' | 'or' })}
          />
        </Group>
        <Group gap={4} wrap="nowrap">
          <Tooltip label="Add condition">
            <Button size="compact-xs" variant="light" leftSection={<IconPlus size={12} />}
              onClick={() => addChild({ type: 'field', field: 'queue', op: 'eq', value: '' })}>
              Condition
            </Button>
          </Tooltip>
          <Tooltip label="Add nested group">
            <Button size="compact-xs" variant="light" leftSection={<IconBraces size={12} />}
              onClick={() => addChild({ type: 'and', children: [] })}>
              Group
            </Button>
          </Tooltip>
          <Tooltip label="Wrap in NOT">
            <ActionIcon variant="subtle" color="gray" size="sm"
              onClick={() => onChange({ type: 'not', child: cond } as Condition)}>
              <IconArrowBack size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete group">
            <ActionIcon variant="subtle" color="red" size="sm" onClick={onDelete}>
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      <Divider mb={6} />
      {cond.children.length === 0 ? (
        <Text size="xs" c="dimmed" ta="center" py="sm">No conditions. Add one above.</Text>
      ) : (
        cond.children.map((child, i) =>
          child.type === 'and' || child.type === 'or' ? (
            <ConditionGroup
              key={i}
              cond={child}
              onChange={(c) => updateChild(i, c)}
              onDelete={() => removeChild(i)}
              records={records}
            />
          ) : (
            <ConditionNode
              key={i}
              cond={child}
              onChange={(c) => updateChild(i, c)}
              onDelete={() => removeChild(i)}
              depth={1}
            />
          ),
        )
      )}
    </Box>
  )
}

export function describeCondition(cond: Condition): string {
  switch (cond.type) {
    case 'field':
      return `${cond.field} ${cond.op} ${JSON.stringify(cond.value)}`
    case 'numeric':
      return `${cond.field} ${cond.op} ${JSON.stringify(cond.value)}`
    case 'time':
      return `time.${cond.op} ${JSON.stringify(cond.value)}`
    case 'aggregate':
      return `${cond.agg}(${cond.field ?? '*'}) per ${cond.group_by} ${cond.op} ${cond.value} (window ${cond.window.amount} ${cond.window.unit})`
    case 'and':
    case 'or':
      return `(${cond.children.map(describeCondition).join(` ${cond.type} `)})`
    case 'not':
      return `NOT ${describeCondition(cond.child)}`
  }
}
