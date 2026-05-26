import { useState, useMemo } from 'react'
import { Table, ScrollArea, Text, UnstyledButton, Group, Pagination } from '@mantine/core'
import { motion } from 'framer-motion'
import { IconArrowUp, IconArrowDown, IconArrowsSort } from '@tabler/icons-react'
import { ContactRecord } from '../types'

function fieldLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase())
}

interface MetricsTableProps {
  records: ContactRecord[]
}

type SortDir = 'asc' | 'desc'

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.006, duration: 0.15, ease: 'easeOut' },
  }),
}

const PAGE_SIZES = [10, 20, 50] as const

export function MetricsTable({ records }: MetricsTableProps) {
  const [sortKey, setSortKey] = useState<keyof ContactRecord | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const sortedRecords = useMemo(() => {
    if (!sortKey) return records
    return [...records].sort((a, b) => {
      const va = String(a[sortKey] ?? '')
      const vb = String(b[sortKey] ?? '')
      const cmp = va.localeCompare(vb, undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [records, sortKey, sortDir])

  const totalPages = Math.ceil(sortedRecords.length / pageSize)
  const paginatedRecords = sortedRecords.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key: keyof ContactRecord) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  if (records.length === 0) return null

  const keys = Object.keys(records[0]) as (keyof ContactRecord)[]
  const startRow = (page - 1) * pageSize + 1
  const endRow = Math.min(page * pageSize, sortedRecords.length)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
    >
      <ScrollArea style={{ borderRadius: 16 }}>
        <Table highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              {keys.map((key) => {
                const isSorted = sortKey === key
                return (
                  <Table.Th key={String(key)}>
                    <UnstyledButton
                      onClick={() => handleSort(key)}
                      style={{ width: '100%' }}
                    >
                      <Group gap={4} wrap="nowrap">
                        <Text size="sm" fw={600}>
                          {fieldLabel(String(key))}
                        </Text>
                        {isSorted ? (
                          sortDir === 'asc' ? (
                            <IconArrowUp size={12} style={{ flexShrink: 0 }} />
                          ) : (
                            <IconArrowDown size={12} style={{ flexShrink: 0 }} />
                          )
                        ) : (
                          <IconArrowsSort size={12} style={{ flexShrink: 0, opacity: 0.3 }} />
                        )}
                      </Group>
                    </UnstyledButton>
                  </Table.Th>
                )
              })}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedRecords.map((record, i) => (
              <motion.tr
                key={record.contactId || String((page - 1) * pageSize + i)}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
              >
                {keys.map((key) => (
                  <Table.Td key={String(key)}>
                    {record[key] ?? ''}
                  </Table.Td>
                ))}
              </motion.tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Group justify="space-between" mt="sm">
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            {startRow}–{endRow} of {sortedRecords.length.toLocaleString()}
          </Text>
          {sortKey && (
            <Text
              component="span"
              size="xs"
              c="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => { setSortKey(null); setPage(1) }}
            >
              clear sort
            </Text>
          )}
        </Group>
        <Group gap="xs">
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--mantine-color-dimmed)',
              fontSize: 12,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s} / page</option>
            ))}
          </select>
          <Pagination
            total={totalPages}
            value={page}
            onChange={setPage}
            size="sm"
            withControls={false}
          />
        </Group>
      </Group>
    </motion.div>
  )
}
