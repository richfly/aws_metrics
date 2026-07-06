import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { Paper, Text, Group, Divider, ActionIcon, Tooltip, Kbd } from '@mantine/core'
import { useOs } from '@mantine/hooks'
import { motion } from 'framer-motion'
import { IconSearch } from '@tabler/icons-react'
import { ContactRecord } from '../types'
import { calculateMetricsByPhoneDescription, formatMinutes } from '../utils/metricsCalculator'
import { PhoneAnalysisSearch } from './PhoneAnalysisSearch'

interface PhoneDescriptionBreakdownProps {
  records: ContactRecord[]
  totalRecords: number
  filteredRecords: number
  filterLabel: string
}

export function PhoneDescriptionBreakdown({
  records,
  totalRecords,
  filteredRecords,
  filterLabel,
}: PhoneDescriptionBreakdownProps) {
  const groups = useMemo(
    () => calculateMetricsByPhoneDescription(records),
    [records],
  )

  const [searchOpened, setSearchOpened] = useState(false)
  const [searchFilter, setSearchFilter] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const os = useOs()

  const isFiltered = filteredRecords < totalRecords

  const displayGroups = useMemo(() => {
    if (!searchFilter) return groups
    return groups.filter((g) =>
      g.phoneDescription.toLowerCase().includes(searchFilter.toLowerCase()),
    )
  }, [groups, searchFilter])

  const handleSelect = useCallback((name: string) => {
    setSearchFilter(name)
    setTimeout(() => {
      const el = rowRefs.current.get(name)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.style.transition = 'background-color 0.6s'
        el.style.backgroundColor = 'var(--mantine-color-teal-9)'
        setTimeout(() => {
          el.style.backgroundColor = 'transparent'
        }, 2000)
      }
    }, 100)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpened((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const setRowRef = useCallback((name: string, el: HTMLDivElement | null) => {
    if (el) {
      rowRefs.current.set(name, el)
    } else {
      rowRefs.current.delete(name)
    }
  }, [])

  if (totalRecords === 0) {
    return (
      <Paper shadow="sm" radius="md" p="xl" className="glass-panel">
        <Text c="dimmed" ta="center" py="xl">
          No data available. Click "Load Data" in the header to upload contact records.
        </Text>
      </Paper>
    )
  }

  if (groups.length === 0) {
    return (
      <Paper shadow="sm" radius="md" p="xl" className="glass-panel">
        <Text c="dimmed" ta="center" py="xl">
          No contacts have a phone description. Upload the Phone Numbers CSV to enrich records.
        </Text>
      </Paper>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <PhoneAnalysisSearch
        groups={groups}
        onSelect={handleSelect}
        opened={searchOpened}
        onClose={() => setSearchOpened(false)}
      />

      <Paper shadow="sm" radius="md" p="md" className="glass-panel">
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={600} size="lg">
              KPIs by Phone Description
              {searchFilter && (
                <Text component="span" size="sm" fw={400} c="dimmed">
                  {' '}— filtered to "{searchFilter}"
                </Text>
              )}
            </Text>
            <Group gap={6}>
              <Text size="xs" c="dimmed">
                {displayGroups.length} of {groups.length} phone descriptions
                {filteredRecords > 0 &&
                  ` \u2014 ${filteredRecords.toLocaleString()} of ${totalRecords.toLocaleString()} records`}
                {isFiltered && ` (filtered)`}
                {filterLabel && ` \u2014 ${filterLabel}`}
              </Text>
              {searchFilter && (
                <Text
                  size="xs"
                  c="teal"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSearchFilter(null)}
                >
                  clear search
                </Text>
              )}
            </Group>
          </div>
          <Tooltip
            label={
              <Group gap={4}>
                <span>Search & ask</span>
                <Kbd style={{ fontSize: 9 }}>
                  {os === 'macos' || os === 'ios' ? '⌘' : 'Ctrl'}+K
                </Kbd>
              </Group>
            }
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="xl"
              onClick={() => setSearchOpened(true)}
            >
              <IconSearch size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <div ref={scrollRef}>
          <Group mb="xs" px="xs">
            <Text size="xs" c="dimmed" style={{ width: 200 }}>Phone Description</Text>
            <Text size="xs" c="dimmed" ta="right" style={{ width: 64 }}>Records</Text>
            <Text size="xs" c="dimmed" ta="right" style={{ width: 100 }}>Avg Connect</Text>
            <Text size="xs" c="dimmed" ta="right" style={{ width: 100 }}>Avg Handle</Text>
            <Text size="xs" c="dimmed" ta="right" style={{ width: 100 }}>Avg ACW</Text>
          </Group>

          <Divider mb="xs" />

          {displayGroups.map((g) => (
            <Group
              key={g.phoneDescription}
              px="xs"
              py={6}
              ref={(el) => setRowRef(g.phoneDescription, el)}
              style={{ borderRadius: 4, transition: 'background-color 0.6s' }}
            >
              <Text size="sm" fw={500} style={{ width: 200 }}>{g.phoneDescription}</Text>
              <Text size="sm" fw={600} ta="right" style={{ width: 64 }}>{g.count.toLocaleString()}</Text>
              <Text size="sm" fw={600} ta="right" style={{ width: 100 }}>{formatMinutes(g.avgConnectTime)}</Text>
              <Text size="sm" fw={600} ta="right" style={{ width: 100 }}>{formatMinutes(g.avgHandleTime)}</Text>
              <Text size="sm" fw={600} ta="right" style={{ width: 100 }}>{formatMinutes(g.avgAcwTime)}</Text>
            </Group>
          ))}
        </div>
      </Paper>
    </motion.div>
  )
}
