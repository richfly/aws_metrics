import { Drawer, Stack, Group, Text, Badge, Paper, Table, ScrollArea, Title, Box } from '@mantine/core'
import { useMemo } from 'react'
import type { Assignment, Reviewer, Workflow } from '../../types/review'
import type { ContactRecord } from '../../types'
import { StateBadge } from './StateBadge'
import { AssignmentActions } from './AssignmentActions'
import { Avatar } from '../reviewers/ReviewerSelector'
import posthog from '../../lib/posthog'

interface Props {
  assignment: Assignment | null
  workflow: Workflow | null
  reviewer: Reviewer | null
  records: ContactRecord[]
  onClose: () => void
  onTransition: (assignmentId: string, to: any, note: string | null) => Promise<boolean>
  actorId: string | null
}

export function AssignmentDetail({
  assignment, workflow, reviewer, records, onClose, onTransition, actorId,
}: Props) {
  const matched = useMemo(() => {
    if (!assignment) return []
    const ids = new Set(assignment.contact_ids)
    return records.filter((r) => ids.has(r.contactId))
  }, [assignment, records])

  if (!assignment) return null

  return (
    <Drawer
      opened={!!assignment}
      onClose={onClose}
      position="right"
      size="lg"
      title={
        <Group gap="xs">
          <Text fw={600}>{workflow?.name ?? 'Assignment'}</Text>
          <StateBadge state={assignment.state} />
        </Group>
      }
    >
      <Stack gap="md">
        <Paper withBorder radius="md" p="sm">
          <Stack gap={4}>
            <Group gap="xs">
              <Text size="xs" c="dimmed">Group key:</Text>
              <Text size="xs" ff="monospace">{assignment.group_key}</Text>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">Reviewer:</Text>
              {reviewer ? (
                <Group gap={4}>
                  <Avatar reviewer={reviewer} size={16} />
                  <Text size="xs">{reviewer.name}</Text>
                </Group>
              ) : <Text size="xs">Unassigned</Text>}
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">Calls:</Text>
              <Badge size="sm" variant="light">{matched.length}</Badge>
              <Text size="xs" c="dimmed">Created:</Text>
              <Text size="xs">{new Date(assignment.created_at).toLocaleString()}</Text>
            </Group>
          </Stack>
        </Paper>

        <Box>
          <Title order={5} mb={4}>Calls in this assignment</Title>
          <Paper withBorder radius="md" p={0}>
            <ScrollArea.Autosize mah={300}>
              <Table striped highlightOnHover stickyHeader withRowBorders={false}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>When</Table.Th>
                    <Table.Th>Queue</Table.Th>
                    <Table.Th>Agent</Table.Th>
                    <Table.Th>Customer</Table.Th>
                    <Table.Th>Duration</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {matched.map((r) => (
                    <Table.Tr key={r.contactId}>
                      <Table.Td><Text size="xs">{r.initiationTimestamp}</Text></Table.Td>
                      <Table.Td><Text size="xs">{r.queue || '—'}</Text></Table.Td>
                      <Table.Td><Text size="xs">{r.agent || '—'}</Text></Table.Td>
                      <Table.Td><Text size="xs">{r.customerPhoneNumber || '—'}</Text></Table.Td>
                      <Table.Td><Text size="xs">{r.contactDuration || '—'}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          </Paper>
        </Box>

        <Box>
          <Title order={5} mb={4}>Actions</Title>
          <AssignmentActions
            assignmentId={assignment.id}
            onTransition={async (to, note) => {
              const ok = await onTransition(assignment.id, to, note)
              if (ok && actorId) {
                const event = `review_${to}` as const
                if (event === 'review_completed' || event === 'review_flagged' || event === 'review_escalated') {
                  posthog.capture(event, { assignment_id: assignment.id, workflow_id: assignment.workflow_id })
                }
              }
              return ok
            }}
          />
        </Box>
      </Stack>
    </Drawer>
  )
}
