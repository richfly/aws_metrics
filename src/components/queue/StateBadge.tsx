import { Badge } from '@mantine/core'
import type { AssignmentState } from '../../types/review'

const COLORS: Record<AssignmentState, string> = {
  assigned:    'blue',
  in_progress: 'yellow',
  completed:   'teal',
  flagged:     'orange',
  escalated:   'red',
}

const LABELS: Record<AssignmentState, string> = {
  assigned:    'Assigned',
  in_progress: 'In progress',
  completed:   'Completed',
  flagged:     'Flagged',
  escalated:   'Escalated',
}

export function StateBadge({ state }: { state: AssignmentState }) {
  return (
    <Badge color={COLORS[state]} variant="light" size="sm" radius="sm">
      {LABELS[state]}
    </Badge>
  )
}
