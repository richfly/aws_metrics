import { useState, useEffect, useCallback } from 'react'
import { Grid, Stack, Paper, Loader, Center, Text, Title, Group, Badge } from '@mantine/core'
import { useWorkflows } from '../../hooks/useWorkflows'
import { useReviewers } from '../../hooks/useReviewers'
import { WorkflowList } from './WorkflowList'
import { WorkflowEditor } from './WorkflowEditor'
import { WorkflowTester } from './WorkflowTester'
import type { Workflow } from '../../types/review'
import type { ContactRecord } from '../../types'
import posthog from '../../lib/posthog'

interface Props {
  records: ContactRecord[]
}

export function WorkflowsPage({ records }: Props) {
  const { workflows, loading, error, create, update, remove, refresh } = useWorkflows()
  const { reviewers, loading: reviewersLoading } = useReviewers()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (workflows.length > 0 && !selectedId) setSelectedId(workflows[0].id)
  }, [workflows, selectedId])

  const selected = workflows.find((w) => w.id === selectedId) ?? null

  const handleCreate = useCallback(async () => {
    const w = await create({
      name: 'New workflow',
      description: '',
      granularity: 'per_call',
      conditions: { type: 'and', children: [] },
    })
    if (w) {
      setSelectedId(w.id)
      posthog.capture('workflow_created', { workflow_id: w.id })
    }
  }, [create])

  const handleSave = useCallback(async (id: string, patch: Partial<Workflow>) => {
    const ok = await update(id, patch)
    if (ok) posthog.capture('workflow_updated', { workflow_id: id })
    return ok
  }, [update])

  const handleDelete = useCallback(async (id: string) => {
    const ok = await remove(id)
    if (ok) {
      setSelectedId(null)
      posthog.capture('workflow_deleted', { workflow_id: id })
    }
    return ok
  }, [remove])

  const handleToggle = useCallback(async (w: Workflow) => {
    await update(w.id, { is_enabled: !w.is_enabled })
    posthog.capture('workflow_enabled_toggled', { workflow_id: w.id, is_enabled: !w.is_enabled })
  }, [update])

  if (loading || reviewersLoading) {
    return (
      <Center mih={200}>
        <Loader />
      </Center>
    )
  }
  if (error) {
    return (
      <Paper p="md" withBorder>
        <Text c="red">Error loading workflows: {error}</Text>
      </Paper>
    )
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={3}>Workflows</Title>
          <Text size="sm" c="dimmed">
            Build rules that automatically assign calls to reviewers.
            Rules re-run whenever new data is loaded.
          </Text>
        </div>
        <Group gap="xs">
          <Badge variant="light" color="teal">{workflows.filter((w) => w.is_enabled).length} active</Badge>
          <Badge variant="light" color="gray">{workflows.length} total</Badge>
        </Group>
      </Group>
      <Grid>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper p="sm" withBorder radius="md">
            <WorkflowList
              workflows={workflows}
              onSelect={(w) => setSelectedId(w.id)}
              onCreate={handleCreate}
              onToggle={handleToggle}
              onRun={(w) => posthog.capture('workflow_test_run', { workflow_id: w.id })}
              selectedId={selectedId ?? undefined}
            />
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 7 }}>
          {selected ? (
            <Stack gap="md">
              <Paper p="md" withBorder radius="md">
                <WorkflowEditor
                  workflow={selected}
                  records={records}
                  reviewers={reviewers}
                  onSave={(patch) => handleSave(selected.id, patch)}
                  onDelete={() => handleDelete(selected.id)}
                />
              </Paper>
              <Paper p="md" withBorder radius="md">
                <WorkflowTester workflow={selected} records={records} />
              </Paper>
            </Stack>
          ) : (
            <Paper p="xl" withBorder radius="md">
              <Text c="dimmed" ta="center">Select a workflow to edit, or create a new one.</Text>
            </Paper>
          )}
        </Grid.Col>
      </Grid>
      <Group justify="end">
        <Text size="xs" c="dimmed" onClick={() => refresh()} style={{ cursor: 'pointer' }}>
          Refresh
        </Text>
      </Group>
    </Stack>
  )
}
