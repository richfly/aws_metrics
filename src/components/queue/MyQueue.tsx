import { useState, useMemo } from 'react'
import { Stack, Group, Paper, Text, Loader, Center, SegmentedControl, Title, Badge, ScrollArea, Box } from '@mantine/core'
import { useAssignments } from '../../hooks/useAssignments'
import { useWorkflows } from '../../hooks/useWorkflows'
import { useReviewers } from '../../hooks/useReviewers'
import { useCurrentReviewer } from '../../hooks/useReviewers'
import type { Assignment, AssignmentState } from '../../types/review'
import type { ContactRecord } from '../../types'
import { StateBadge } from './StateBadge'
import { AssignmentDetail } from './AssignmentDetail'
import { Avatar } from '../reviewers/ReviewerSelector'
import posthog from '../../lib/posthog'

interface Props {
  records: ContactRecord[]
}

const FILTERS: Array<{ value: string; label: string }> = [
  { value: 'open',       label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed',  label: 'Completed' },
  { value: 'flagged',    label: 'Flagged' },
  { value: 'escalated',  label: 'Escalated' },
  { value: 'all',        label: 'All' },
]

const OPEN_STATES: AssignmentState[] = ['assigned']

export function MyQueue({ records }: Props) {
  const { reviewers } = useReviewers()
  const { current: currentReviewer } = useCurrentReviewer(reviewers)
  const { workflows } = useWorkflows()
  const { assignments, loading, transition, refresh } = useAssignments(currentReviewer?.id ?? null)
  const [filter, setFilter] = useState<string>('open')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return assignments
    if (filter === 'open') return assignments.filter((a) => a.state === 'assigned')
    return assignments.filter((a) => a.state === filter)
  }, [assignments, filter])

  const counts = useMemo(() => {
    const c: Record<string, number> = { open: 0 }
    for (const a of assignments) {
      if (a.state === 'assigned') c.open += 1
      c[a.state] = (c[a.state] ?? 0) + 1
    }
    return c
  }, [assignments])

  const selected = assignments.find((a) => a.id === selectedId) ?? null
  const selectedWorkflow = selected ? workflows.find((w) => w.id === selected.workflow_id) ?? null : null
  const selectedReviewer = currentReviewer

  if (!currentReviewer) {
    return (
      <Paper p="md" withBorder>
        <Text c="dimmed">Select a reviewer from the header dropdown to see your queue.</Text>
      </Paper>
    )
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="end">
        <Group gap="sm" align="center">
          <Avatar reviewer={currentReviewer} size={36} />
          <div>
            <Title order={3}>{currentReviewer.name}'s queue</Title>
            <Text size="sm" c="dimmed">
              {assignments.length === 0
                ? 'No assignments yet. Create a workflow to start.'
                : `${counts.open ?? 0} open · ${assignments.length} total`}
            </Text>
          </div>
        </Group>
        <Group gap="xs">
          {FILTERS.map((f) => (
            <Badge
              key={f.value}
              variant={filter === f.value ? 'filled' : 'light'}
              color={filter === f.value ? 'teal' : 'gray'}
              style={{ cursor: 'pointer' }}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Badge>
          ))}
        </Group>
      </Group>

      {loading ? (
        <Center mih={200}><Loader /></Center>
      ) : filtered.length === 0 ? (
        <Paper p="xl" withBorder radius="md">
          <Stack gap={4} align="center">
            <Text c="dimmed">No assignments match this filter.</Text>
            {filter === 'open' && OPEN_STATES.length > 0 && (
              <Text size="xs" c="dimmed">Materialization runs on data refresh; try uploading or syncing contacts.</Text>
            )}
          </Stack>
        </Paper>
      ) : (
        <ScrollArea.Autosize mah={520}>
          <Stack gap={6}>
            {filtered.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                workflow={workflows.find((w) => w.id === a.workflow_id) ?? null}
                onOpen={() => setSelectedId(a.id)}
              />
            ))}
          </Stack>
        </ScrollArea.Autosize>
      )}

      <AssignmentDetail
        assignment={selected}
        workflow={selectedWorkflow}
        reviewer={selectedReviewer}
        records={records}
        onClose={() => setSelectedId(null)}
        onTransition={async (id, to, note) => {
          const ok = await transition(id, to, note, currentReviewer.id)
          if (ok) {
            posthog.capture('assignment_state_changed', { assignment_id: id, to_state: to })
            await refresh()
          }
          return ok
        }}
        actorId={currentReviewer.id}
      />
    </Stack>
  )
}

function AssignmentRow({
  assignment, workflow, onOpen,
}: { assignment: Assignment; workflow: any; onOpen: () => void }) {
  const created = new Date(assignment.created_at)
  return (
    <Paper withBorder radius="md" p="sm" style={{ cursor: 'pointer' }} onClick={onOpen}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Box style={{ minWidth: 0 }}>
            <Group gap={6}>
              <Text size="sm" fw={500} truncate>{workflow?.name ?? '(unknown workflow)'}</Text>
              <StateBadge state={assignment.state} />
            </Group>
            <Text size="xs" c="dimmed" ff="monospace" truncate>{assignment.group_key}</Text>
          </Box>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <Badge size="sm" variant="light">{assignment.contact_ids.length} calls</Badge>
          <Text size="xs" c="dimmed">{created.toLocaleDateString()}</Text>
        </Group>
      </Group>
    </Paper>
  )
}
