import { Stack, Text, Group, Paper, Button, Badge, ActionIcon, Tooltip, ScrollArea, Box, Code } from '@mantine/core'
import { IconPlus, IconPencil, IconPlayerPlay, IconChevronRight } from '@tabler/icons-react'
import { useState } from 'react'
import type { Workflow } from '../../types/review'
import { describeCondition } from './ConditionEditor'

interface Props {
  workflows: Workflow[]
  onSelect: (w: Workflow) => void
  onCreate: () => void
  onToggle: (w: Workflow) => void
  onRun: (w: Workflow) => void
  selectedId?: string
}

export function WorkflowList({ workflows, onSelect, onCreate, onToggle, onRun, selectedId }: Props) {
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={500}>Workflows</Text>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={onCreate}>
          New workflow
        </Button>
      </Group>
      <ScrollArea.Autosize mah={520}>
        <Stack gap={6}>
          {workflows.length === 0 && (
            <Paper p="md" withBorder radius="md">
              <Text size="sm" c="dimmed" ta="center">
                No workflows yet. Create one to start matching calls to reviewers.
              </Text>
            </Paper>
          )}
          {workflows.map((w) => {
            const active = w.id === selectedId
            return (
              <Paper
                key={w.id}
                withBorder
                radius="md"
                p="sm"
                style={{
                  cursor: 'pointer',
                  borderColor: active ? 'var(--mantine-color-teal-5)' : undefined,
                }}
                onClick={() => onSelect(w)}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                    <ActionIcon
                      variant={w.is_enabled ? 'filled' : 'subtle'}
                      color={w.is_enabled ? 'teal' : 'gray'}
                      size="sm" radius="xl"
                      onClick={(e) => { e.stopPropagation(); onToggle(w) }}
                      title={w.is_enabled ? 'Disable' : 'Enable'}
                    >
                      <IconPlayerPlay size={10} />
                    </ActionIcon>
                    <Box style={{ minWidth: 0 }}>
                      <Group gap={6} wrap="nowrap">
                        <Text size="sm" fw={500} truncate>{w.name}</Text>
                        <Badge size="xs" variant="light" color={w.granularity === 'per_call' ? 'blue' : 'violet'}>
                          {w.granularity === 'per_call' ? 'per call' : `per ${w.group_by ?? 'group'}`}
                        </Badge>
                      </Group>
                      <Code style={{ fontSize: 11 }}>{describeCondition(w.conditions)}</Code>
                    </Box>
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label="Edit">
                      <ActionIcon variant="subtle" size="sm" onClick={(e) => { e.stopPropagation(); onSelect(w) }}>
                        <IconPencil size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <IconChevronRight size={14} />
                  </Group>
                </Group>
              </Paper>
            )
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  )
}
