import { Menu, UnstyledButton, Group, Text, Box, ScrollArea, Badge } from '@mantine/core'
import { IconChevronDown, IconCheck, IconUserCircle } from '@tabler/icons-react'
import type { Reviewer } from '../../types/review'

interface Props {
  reviewers: Reviewer[]
  current: Reviewer | null
  onSelect: (id: string) => void
  pendingCount?: number
}

export function ReviewerSelector({ reviewers, current, onSelect, pendingCount }: Props) {
  return (
    <Menu shadow="md" width={260} position="bottom-end" withinPortal>
      <Menu.Target>
        <UnstyledButton
          aria-label="Switch reviewer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px 4px 4px',
            borderRadius: 999,
            background: 'var(--mantine-color-default-hover)',
            transition: 'background 120ms',
          }}
        >
          <Avatar reviewer={current} size={28} />
          <Box style={{ lineHeight: 1.1 }}>
            <Text size="sm" fw={500}>
              {current?.name ?? 'Select reviewer'}
            </Text>
            <Text size="xs" c="dimmed">Reviewer</Text>
          </Box>
          {pendingCount !== undefined && pendingCount > 0 && (
            <Badge size="sm" variant="filled" color="teal" circle>
              {pendingCount}
            </Badge>
          )}
          <IconChevronDown size={14} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Switch reviewer (demo)</Menu.Label>
        <ScrollArea.Autosize mah={320}>
          {reviewers.map((r) => (
            <Menu.Item
              key={r.id}
              leftSection={<Avatar reviewer={r} size={24} />}
              rightSection={r.id === current?.id ? <IconCheck size={14} /> : null}
              onClick={() => onSelect(r.id)}
            >
              <Group justify="space-between" gap="xs" wrap="nowrap">
                <Text size="sm">{r.name}</Text>
              </Group>
            </Menu.Item>
          ))}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  )
}

interface AvatarProps {
  reviewer: Pick<Reviewer, 'name' | 'initials' | 'avatar_hue'> | null
  size?: number
}

export function Avatar({ reviewer, size = 24 }: AvatarProps) {
  if (!reviewer) {
    return (
      <Box
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--mantine-color-gray-5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconUserCircle size={size * 0.7} color="white" />
      </Box>
    )
  }
  return (
    <Box
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `hsl(${reviewer.avatar_hue} 65% 45%)`,
        color: 'white',
        fontSize: size * 0.4,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 1,
        letterSpacing: 0.2,
      }}
    >
      {reviewer.initials}
    </Box>
  )
}
