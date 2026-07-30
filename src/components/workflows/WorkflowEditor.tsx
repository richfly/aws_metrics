import { Stack, TextInput, Textarea, Group, Switch, SegmentedControl, NativeSelect, Button, Paper, Text } from '@mantine/core'
import { IconDeviceFloppy, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import type { Reviewer, Workflow } from '../../types/review'
import type { ContactRecord } from '../../types'
import { ConditionGroup } from './ConditionEditor'

interface Props {
  workflow: Workflow
  records: ContactRecord[]
  reviewers: Reviewer[]
  onSave: (patch: Partial<Workflow>) => Promise<boolean>
  onDelete: () => Promise<boolean>
}

const GROUP_BY_OPTIONS = [
  { value: 'customerPhoneNumber', label: 'Customer Phone' },
  { value: 'agent',               label: 'Agent' },
  { value: 'queue',               label: 'Queue' },
  { value: 'systemPhoneNumber',   label: 'System Phone' },
]

export function WorkflowEditor({ workflow, records, reviewers, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<Workflow>(workflow)
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(workflow)

  const save = async () => {
    setSaving(true)
    const ok = await onSave({
      name: draft.name,
      description: draft.description,
      is_enabled: draft.is_enabled,
      granularity: draft.granularity,
      group_by: draft.granularity === 'per_group' ? draft.group_by : null,
      conditions: draft.conditions,
      assign_to: draft.assign_to,
    })
    setSaving(false)
    void ok
  }

  return (
    <Stack gap="md">
      <Paper p="md" withBorder radius="md">
        <Stack gap="sm">
          <TextInput
            label="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.currentTarget.value })}
          />
          <Textarea
            label="Description"
            autosize minRows={1} maxRows={3}
            value={draft.description ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.currentTarget.value })}
          />
          <Group grow>
            <Switch
              label="Enabled"
              checked={draft.is_enabled}
              onChange={(e) => setDraft({ ...draft, is_enabled: e.currentTarget.checked })}
            />
            <NativeSelect
              label="Assign to"
              value={draft.assign_to ?? ''}
              data={[
                { value: '', label: 'Round-robin (v2)' },
                ...reviewers.map((r) => ({ value: r.id, label: r.name })),
              ]}
              onChange={(e) => setDraft({ ...draft, assign_to: e.currentTarget.value || null })}
            />
          </Group>
          <Stack gap={4}>
            <Text size="sm" fw={500}>Granularity</Text>
            <SegmentedControl
              value={draft.granularity}
              data={[
                { value: 'per_call',   label: 'One task per matching call' },
                { value: 'per_group',  label: 'One task per group' },
              ]}
              onChange={(v) => setDraft({ ...draft, granularity: v as 'per_call' | 'per_group' })}
            />
          </Stack>
          {draft.granularity === 'per_group' && (
            <NativeSelect
              label="Group by"
              value={draft.group_by ?? 'customerPhoneNumber'}
              data={GROUP_BY_OPTIONS}
              onChange={(e) => setDraft({ ...draft, group_by: e.currentTarget.value as any })}
            />
          )}
        </Stack>
      </Paper>

      <Paper p="md" withBorder radius="md">
        <Text size="sm" fw={500} mb="xs">Conditions</Text>
        <ConditionGroup
          cond={draft.conditions.type === 'and' || draft.conditions.type === 'or'
            ? draft.conditions
            : { type: 'and', children: [draft.conditions] }}
          onChange={(c) => setDraft({ ...draft, conditions: c })}
          onDelete={() => setDraft({ ...draft, conditions: { type: 'and', children: [] } })}
          records={records}
        />
      </Paper>

      <Group justify="space-between">
        <Button
          variant="subtle" color="red"
          leftSection={<IconTrash size={14} />}
          onClick={async () => {
            if (confirm('Delete this workflow? Existing assignments remain in the database.')) {
              await onDelete()
            }
          }}
        >
          Delete workflow
        </Button>
        <Button
          disabled={!dirty}
          loading={saving}
          leftSection={<IconDeviceFloppy size={14} />}
          onClick={save}
        >
          Save changes
        </Button>
      </Group>
    </Stack>
  )
}
