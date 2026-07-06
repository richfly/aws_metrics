import { useEffect, useState, useRef } from 'react'
import {
  Modal,
  TextInput,
  ScrollArea,
  Text,
  Group,
  Paper,
  Kbd,
} from '@mantine/core'
import { useOs } from '@mantine/hooks'
import { IconSearch, IconCircuitBulb, IconDeviceAnalytics } from '@tabler/icons-react'
import { PhoneDescriptionGroup } from '../utils/metricsCalculator'
import { parseQuestion, QueryResult } from '../utils/phoneQueryEngine'

interface PhoneAnalysisSearchProps {
  groups: PhoneDescriptionGroup[]
  onSelect: (name: string) => void
  opened: boolean
  onClose: () => void
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${q})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <Text component="span" fw={700} c="teal" key={i}>{part}</Text>
      : part,
  )
}

export function PhoneAnalysisSearch({
  groups,
  onSelect,
  opened,
  onClose,
}: PhoneAnalysisSearchProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const os = useOs()

  const q = query.trim().toLowerCase()

  const matchedDescriptions = q
    ? groups.filter((g) =>
        g.phoneDescription.toLowerCase().includes(q),
      )
    : []

  const questionResult: QueryResult | null = q.length >= 3
    ? parseQuestion(query, groups)
    : null

  const showResults = q.length > 0

  useEffect(() => {
    if (opened) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [opened])

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconSearch size={18} />
          <Text size="sm">Search phone descriptions or ask a question</Text>
        </Group>
      }
      size="lg"
      closeOnClickOutside
      styles={{
        body: { padding: 0 },
        header: { padding: '12px 16px 0' },
      }}
    >
      <div style={{ padding: '0 12px 12px' }}>
        <TextInput
          ref={inputRef}
          placeholder="e.g. Support Line, or 'which number has the worst connect time?'"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          rightSection={
            <Kbd style={{ fontSize: 10, padding: '2px 5px' }}>
              {os === 'macos' || os === 'ios' ? '⌘K' : 'Ctrl+K'}
            </Kbd>
          }
          styles={{ input: { border: 'none', fontSize: 15 } }}
        />
      </div>

      {showResults && (
        <ScrollArea mah={380} style={{ borderTop: '1px solid var(--mantine-color-gray-8)' }}>
          <div style={{ padding: '8px 12px 12px' }}>
            {matchedDescriptions.length > 0 && (
              <div style={{ marginBottom: questionResult ? 12 : 0 }}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                  Phone Descriptions
                </Text>
                {matchedDescriptions.slice(0, 8).map((g) => (
                  <Paper
                    key={g.phoneDescription}
                    p="xs"
                    withBorder
                    style={{
                      cursor: 'pointer',
                      marginBottom: 4,
                    }}
                    onClick={() => {
                      onSelect(g.phoneDescription)
                      onClose()
                    }}
                  >
                    <Group justify="space-between">
                      <Text size="sm">
                        {highlightMatch(g.phoneDescription, q)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {g.count.toLocaleString()} records
                      </Text>
                    </Group>
                  </Paper>
                ))}
                {matchedDescriptions.length > 8 && (
                  <Text size="xs" c="dimmed" ta="center" mt={2}>
                    +{matchedDescriptions.length - 8} more
                  </Text>
                )}
              </div>
            )}

            {questionResult && (
              <div>
                <Group gap={6} mb={4}>
                  <IconCircuitBulb size={14} color="var(--mantine-color-teal-6)" />
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Smart Answer
                  </Text>
                </Group>
                <Paper p="sm" radius="md" style={{ background: 'var(--mantine-color-dark-6)' }}>
                  <Text size="sm" fw={600} mb={4}>
                    <IconDeviceAnalytics
                      size={14}
                      style={{ marginRight: 6, verticalAlign: -2 }}
                    />
                    {questionResult.title}
                  </Text>
                  {questionResult.lines.map((line, i) => (
                    <Text key={i} size="sm" c="dimmed" style={{ fontFamily: 'monospace' }}>
                      {line}
                    </Text>
                  ))}
                </Paper>
              </div>
            )}

            {!matchedDescriptions.length && !questionResult && q.length >= 2 && (
              <Text size="sm" c="dimmed" ta="center" py="lg">
                No matching phone descriptions. Try asking a question like
                {' "'}which number has the most calls?{'"'}
              </Text>
            )}

            {!matchedDescriptions.length && !questionResult && q.length === 1 && (
              <Text size="sm" c="dimmed" ta="center" py="lg">
                Keep typing to search or ask...
              </Text>
            )}
          </div>
        </ScrollArea>
      )}
    </Modal>
  )
}
