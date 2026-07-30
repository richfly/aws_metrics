import { Timeline, Text, Textarea, Group, Button, Stack, Paper, Box } from '@mantine/core'
import { IconCheck, IconFlag, IconArrowUp, IconClock, IconUser } from '@tabler/icons-react'
import { useState } from 'react'
import type { AssignmentEvent, AssignmentState } from '../../types/review'
import { useAssignmentEvents } from '../../hooks/useAssignments'
import { useReviewers } from '../../hooks/useReviewers'
import { StateBadge } from './StateBadge'
import { Avatar } from '../reviewers/ReviewerSelector'

interface Props {
  assignmentId: string
  onTransition: (to: AssignmentState, note: string | null) => Promise<boolean>
  disabled?: boolean
}

const ICONS: Record<AssignmentState, JSX.Element> = {
  assigned:    <IconClock size={14} />,
  in_progress: <IconUser size={14} />,
  completed:   <IconCheck size={14} />,
  flagged:     <IconFlag size={14} />,
  escalated:   <IconArrowUp size={14} />,
}

export function AssignmentActions({ assignmentId, onTransition, disabled }: Props) {
  const { events, loading } = useAssignmentEvents(assignmentId)
  const { reviewers } = useReviewers()
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<AssignmentState | null>(null)

  const handle = async (to: AssignmentState) => {
    setPending(to)
    await onTransition(to, note.trim() || null)
    setPending(null)
    setNote('')
  }

  return (
    <Stack gap="sm">
      <Group gap={6} wrap="wrap">
        <Button size="xs" variant="light" color="yellow" leftSection={<IconUser size={12} />}
          loading={pending === 'in_progress'}
          onClick={() => handle('in_progress')}
          disabled={disabled}>
          Start review
        </Button>
        <Button size="xs" variant="light" color="teal" leftSection={<IconCheck size={12} />}
          loading={pending === 'completed'}
          onClick={() => handle('completed')}
          disabled={disabled}>
          Complete
        </Button>
        <Button size="xs" variant="light" color="orange" leftSection={<IconFlag size={12} />}
          loading={pending === 'flagged'}
          onClick={() => handle('flagged')}
          disabled={disabled}>
          Flag
        </Button>
        <Button size="xs" variant="light" color="red" leftSection={<IconArrowUp size={12} />}
          loading={pending === 'escalated'}
          onClick={() => handle('escalated')}
          disabled={disabled}>
          Escalate
        </Button>
      </Group>
      <Textarea
        size="xs" label="Note (optional)" placeholder="Add a note attached to the next transition"
        autosize minRows={1} maxRows={3} value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
      />
      <Box>
        <Text size="xs" c="dimmed" mb={4}>History</Text>
        {loading && <Text size="xs" c="dimmed">Loading…</Text>}
        {!loading && events.length === 0 && (
          <Text size="xs" c="dimmed">No transitions yet.</Text>
        )}
        {!loading && events.length > 0 && (
          <Paper withBorder radius="md" p="xs">
            <Timeline active={events.length} bulletSize={16} lineWidth={2}>
              {events.map((e: AssignmentEvent) => {
                const actor = reviewers.find((r) => r.id === e.actor_id)
                return (
                  <Timeline.Item
                    key={e.id}
                    bullet={ICONS[e.to_state]}
                    color={
                      e.to_state === 'completed' ? 'teal' :
                      e.to_state === 'flagged'   ? 'orange' :
                      e.to_state === 'escalated' ? 'red' :
                      e.to_state === 'in_progress' ? 'yellow' : 'blue'
                    }
                    title={
                      <Group gap={6} wrap="nowrap">
                        {e.from_state && <StateBadge state={e.from_state} />}
                        <Text size="xs" c="dimmed">→</Text>
                        <StateBadge state={e.to_state} />
                      </Group>
                    }
                  >
                    <Group gap={6} wrap="nowrap" align="center">
                      {actor && <Avatar reviewer={actor} size={16} />}
                      <Text size="xs">{actor?.name ?? 'Someone'}</Text>
                      <Text size="xs" c="dimmed">· {new Date(e.created_at).toLocaleString()}</Text>
                    </Group>
                    {e.note && <Text size="xs" mt={2}>{e.note}</Text>}
                  </Timeline.Item>
                )
              })}
            </Timeline>
          </Paper>
        )}
      </Box>
    </Stack>
  )
}
