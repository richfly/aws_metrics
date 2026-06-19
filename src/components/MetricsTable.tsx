import { useState, useMemo } from 'react'
import {
  Table, Text, UnstyledButton, Group, Pagination,
  ScrollArea, MultiSelect, Badge, Select,
} from '@mantine/core'
import { IconArrowUp, IconArrowDown, IconArrowsSort } from '@tabler/icons-react'
import { motion } from 'framer-motion'
import { ContactRecord } from '../types'
import { COLUMNS, type ColumnDef, DEFAULT_COLUMNS } from '../utils/tableColumns'
import { formatSeconds, formatMinutes, formatTimestamp, formatShiftLabel } from '../utils/metricsCalculator'

const PAGE_SIZES = [10, 25, 50, 100, 250] as const

interface MetricsTableProps {
  records: ContactRecord[]
  visibleColumns: string[]
  onVisibleColumnsChange: (columns: string[]) => void
}

type SortDir = 'asc' | 'desc'

function renderCell(col: ColumnDef, record: ContactRecord): React.ReactNode {
  const value = col.getValue(record)

  if (value === null || value === undefined || value === '') {
    return <Text size="sm" c="dimmed">-</Text>
  }

  if (col.id === 'shift') {
    return <Text size="sm" fw={500}>{formatShiftLabel(value as string)}</Text>
  }

  switch (col.type) {
    case 'timestamp':
      return <Text size="sm">{formatTimestamp(value as string)}</Text>
    case 'boolean':
      return (
        <Badge color={value ? 'green' : 'red'} variant="light" size="sm">
          {value ? 'Yes' : 'No'}
        </Badge>
      )
    case 'seconds':
      return <Text size="sm">{formatSeconds(value as number)}</Text>
    case 'minutes': {
      const numVal = value as number
      if (col.id === 'acwTime' && numVal > 30) {
        return <Text size="sm" c="red" fw={700}>{'>'}30m</Text>
      }
      return <Text size="sm">{formatMinutes(numVal)}</Text>
    }
    case 'string':
    default:
      return <Text size="sm" lineClamp={1}>{String(value)}</Text>
  }
}

export function MetricsTable({ records, visibleColumns, onVisibleColumnsChange }: MetricsTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const columnDefs = useMemo(
    () => COLUMNS.filter(c => visibleColumns.includes(c.id)),
    [visibleColumns],
  )

  const columnMap = useMemo(
    () => new Map(COLUMNS.map(c => [c.id, c])),
    [],
  )

  const sortedRecords = useMemo(() => {
    if (!sortKey) return records
    const col = columnMap.get(sortKey)
    if (!col) return records
    return [...records].sort((a, b) => {
      const va = col.getValue(a)
      const vb = col.getValue(b)
      if (va === null || va === undefined || va === '') return 1
      if (vb === null || vb === undefined || vb === '') return -1
      let cmp: number
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb
      } else if (typeof va === 'boolean' && typeof vb === 'boolean') {
        cmp = va === vb ? 0 : va ? -1 : 1
      } else {
        cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [records, sortKey, sortDir, columnMap])

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize))
  const pagedRecords = useMemo(
    () => sortedRecords.slice((page - 1) * pageSize, page * pageSize),
    [sortedRecords, page, pageSize],
  )

  const handleSort = (colId: string) => {
    if (sortKey === colId) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(colId)
      setSortDir('asc')
    }
    setPage(1)
  }

  const multiSelectData = useMemo(() => {
    const groups = new Map<string, { value: string; label: string }[]>()
    for (const c of COLUMNS) {
      let items = groups.get(c.group)
      if (!items) { items = []; groups.set(c.group, items) }
      items.push({ value: c.id, label: c.label })
    }
    return Array.from(groups, ([group, items]) => ({ group, items }))
  }, [])

  if (records.length === 0) return null

  const startRow = (page - 1) * pageSize + 1
  const endRow = Math.min(page * pageSize, sortedRecords.length)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
    >
      <MultiSelect
        label="Columns"
        data={multiSelectData}
        value={visibleColumns}
        onChange={onVisibleColumnsChange}
        searchable
        hidePickedOptions
        maxValues={50}
        mb="sm"
      />

      <ScrollArea h={600}>
        <Table stickyHeader highlightOnHover withRowBorders={false}>
          <Table.Thead>
            <Table.Tr>
              {columnDefs.map(col => {
                const isSorted = sortKey === col.id
                return (
                  <Table.Th key={col.id}>
                    <UnstyledButton onClick={() => handleSort(col.id)}>
                      <Group gap={4} wrap="nowrap">
                        <Text size="xs" fw={600}>{col.label}</Text>
                        {isSorted ? (
                          sortDir === 'asc' ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />
                        ) : (
                          <IconArrowsSort size={12} style={{ opacity: 0.3 }} />
                        )}
                      </Group>
                    </UnstyledButton>
                  </Table.Th>
                )
              })}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pagedRecords.map(record => (
              <Table.Tr key={record.contactId}>
                {columnDefs.map(col => (
                  <Table.Td key={col.id}>
                    {renderCell(col, record)}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Group justify="space-between" mt="sm">
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            {startRow}\u2013{endRow} of {sortedRecords.length.toLocaleString()}
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
          <Select
            value={String(pageSize)}
            onChange={(v) => { setPageSize(Number(v)); setPage(1) }}
            data={PAGE_SIZES.map(s => ({ value: String(s), label: `${s} / page` }))}
            size="xs"
            w={110}
          />
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