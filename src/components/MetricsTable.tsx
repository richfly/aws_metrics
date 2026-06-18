import { useState, useMemo, useEffect } from 'react'
import { Table, Text, UnstyledButton, Group, Pagination } from '@mantine/core'
import { motion } from 'framer-motion'
import { List, useListRef, type RowComponentProps } from 'react-window'
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

const PAGE_SIZES = [10, 20, 50, 100] as const
const ROW_HEIGHT = 36
const HEADER_HEIGHT = 40
const TABLE_HEIGHT = 520

interface RowData {
  records: ContactRecord[]
  keys: (keyof ContactRecord)[]
}

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

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize))
  const paginatedRecords = useMemo(
    () => sortedRecords.slice((page - 1) * pageSize, page * pageSize),
    [sortedRecords, page, pageSize],
  )

  const listRef = useListRef(null)

  useEffect(() => {
    listRef.current?.scrollToRow({ index: 0 })
  }, [page, sortKey, sortDir, pageSize, listRef])

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
  const virtualListHeight = Math.max(
    ROW_HEIGHT * 4,
    Math.min(TABLE_HEIGHT, ROW_HEIGHT * paginatedRecords.length),
  )
  const rowData: RowData = { records: paginatedRecords, keys }

  function Row({ index, style, ariaAttributes, records, keys }: RowComponentProps<RowData>) {
    const record = records[index]
    return (
      <div
        {...ariaAttributes}
        style={{
          ...style,
          display: "table",
          width: "100%",
          tableLayout: "fixed",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        {keys.map((key, colIdx) => (
          <div
            key={String(key)}
            style={{
              display: "table-cell",
              padding: "0 12px",
              lineHeight: `${ROW_HEIGHT}px`,
              height: ROW_HEIGHT,
              verticalAlign: "middle",
              fontSize: 14,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              background:
                colIdx === 0
                  ? "var(--mantine-color-body)"
                  : index % 2 === 0
                  ? "var(--mantine-color-default-hover)"
                  : "transparent",
            }}
          >
            {String(record[key] ?? "")}
          </div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
    >
      <div
        style={{
          border: "1px solid var(--mantine-color-default-border)",
          borderRadius: "var(--mantine-radius-md)",
          overflow: "hidden",
        }}
      >
        <Table
          highlightOnHover
          withRowBorders={false}
          style={{ tableLayout: "fixed", width: "100%" }}
        >
          <Table.Thead style={{ display: "table", width: "100%", tableLayout: "fixed" }}>
            <Table.Tr>
              {keys.map((key) => {
                const isSorted = sortKey === key
                return (
                  <Table.Th
                    key={String(key)}
                    style={{
                      background: "var(--mantine-color-body)",
                      height: HEADER_HEIGHT,
                      padding: 0,
                    }}
                  >
                    <UnstyledButton
                      onClick={() => handleSort(key)}
                      style={{ width: "100%", height: "100%", padding: "0 12px" }}
                    >
                      <Group gap={4} wrap="nowrap" justify="space-between">
                        <Text size="sm" fw={600}>
                          {fieldLabel(String(key))}
                        </Text>
                        {isSorted ? (
                          sortDir === "asc" ? (
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
        </Table>

        {paginatedRecords.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl" size="sm">
            No records on this page.
          </Text>
        ) : (
          <List
            listRef={listRef}
            rowCount={paginatedRecords.length}
            rowHeight={ROW_HEIGHT}
            rowComponent={Row}
            rowProps={rowData}
            defaultHeight={virtualListHeight}
            overscanCount={4}
            style={{ scrollbarWidth: "thin" }}
          />
        )}
      </div>

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
              style={{ cursor: "pointer" }}
              onClick={() => {
                setSortKey(null)
                setPage(1)
              }}
            >
              clear sort
            </Text>
          )}
        </Group>
        <Group gap="xs">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--mantine-color-dimmed)",
              fontSize: 12,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
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
