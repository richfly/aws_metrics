import { useMemo } from 'react'
import { Stack, Group, Text, Paper, Badge, Box, Table, ScrollArea, Title } from '@mantine/core'
import type { GroupByField, Workflow } from '../../types/review'
import type { ContactRecord } from '../../types'
import { runWorkflow } from '../../lib/workflowEngine'

interface Props {
  workflow: Workflow
  records: ContactRecord[]
}

export function WorkflowTester({ workflow, records }: Props) {
  const result = useMemo(() => {
    if (records.length === 0) return null
    return runWorkflow(records, workflow.conditions, workflow.granularity, workflow.group_by)
  }, [records, workflow])

  if (records.length === 0) {
    return (
      <Paper p="md" withBorder radius="md">
        <Text size="sm" c="dimmed">Load contact data to preview matches.</Text>
      </Paper>
    )
  }

  if (!result) return null

  if (workflow.granularity === 'per_group' && workflow.group_by) {
    const entries = Array.from(result.perGroup.entries())
    return <GroupResult entries={entries} groupBy={workflow.group_by} total={records.length} />
  }
  return <CallResult records={result.perCall} total={records.length} />
}

function CallResult({ records, total }: { records: ContactRecord[]; total: number }) {
  return (
    <Stack gap="sm">
      <Group justify="space-between" align="end">
        <Title order={4}>Preview</Title>
        <Group gap="xs">
          <Badge variant="light" color="teal">{records.length} matching calls</Badge>
          <Badge variant="light" color="gray">of {total.toLocaleString()} total</Badge>
        </Group>
      </Group>
      <Paper withBorder radius="md" p={0}>
        <ScrollArea.Autosize mah={300}>
          <Table striped highlightOnHover withRowBorders={false} stickyHeader>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Contact ID</Table.Th>
                <Table.Th>When</Table.Th>
                <Table.Th>Queue</Table.Th>
                <Table.Th>Agent</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Duration (s)</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {records.slice(0, 50).map((r) => (
                <Table.Tr key={r.contactId}>
                  <Table.Td><Text size="xs" ff="monospace">{r.contactId.slice(0, 12)}</Text></Table.Td>
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
      {records.length > 50 && (
        <Text size="xs" c="dimmed" ta="center">Showing 50 of {records.length} matches.</Text>
      )}
    </Stack>
  )
}

function GroupResult({
  entries, groupBy, total,
}: { entries: Array<[string, ContactRecord[]]>; groupBy: GroupByField; total: number }) {
  const totalCalls = entries.reduce((sum, [, recs]) => sum + recs.length, 0)
  return (
    <Stack gap="sm">
      <Group justify="space-between" align="end">
        <Title order={4}>Preview</Title>
        <Group gap="xs">
          <Badge variant="light" color="violet">{entries.length} groups</Badge>
          <Badge variant="light" color="teal">{totalCalls.toLocaleString()} calls</Badge>
          <Badge variant="light" color="gray">of {total.toLocaleString()} total</Badge>
        </Group>
      </Group>
      <Paper withBorder radius="md" p={0}>
        <ScrollArea.Autosize mah={300}>
          <Table striped highlightOnHover withRowBorders={false} stickyHeader>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{groupBy}</Table.Th>
                <Table.Th>Calls</Table.Th>
                <Table.Th>First</Table.Th>
                <Table.Th>Last</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entries.slice(0, 50).map(([key, recs]) => {
                const times = recs.map((r) => r.initiationTimestamp).filter(Boolean).sort()
                return (
                  <Table.Tr key={key}>
                    <Table.Td><Text size="xs" ff="monospace">{key || '(empty)'}</Text></Table.Td>
                    <Table.Td><Badge size="sm" variant="light">{recs.length}</Badge></Table.Td>
                    <Table.Td><Text size="xs">{times[0] || '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs">{times[times.length - 1] || '—'}</Text></Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      </Paper>
      {entries.length > 50 && (
        <Text size="xs" c="dimmed" ta="center">Showing 50 of {entries.length} groups.</Text>
      )}
    </Stack>
  )
}
