import { useState } from 'react'
import { Group, Button, Tooltip, Modal, Text, Paper, Stack, SegmentedControl } from '@mantine/core'
import { motion } from 'framer-motion'
import {
  IconDownload, IconTable, IconClipboardText, IconCheck, IconBook,
  IconDatabase, IconChartBar, IconFilter, IconFileExport,
} from '@tabler/icons-react'
import { ContactRecord, DetailedMetrics } from '../types'
import { downloadCsv, rowsToTsv, copyToClipboard, formatSummaryText, downloadColumnCsv, columnRowsToTsv } from '../utils/exportUtils'
import { COLUMNS } from '../utils/tableColumns'

interface ExportToolbarProps {
  records: ContactRecord[]
  metrics: DetailedMetrics
  totalRecords: number
  filteredRecords: number
  filterLabel: string
  visibleColumns: string[]
}

export function ExportToolbar({ records, metrics, totalRecords, filteredRecords, filterLabel, visibleColumns }: ExportToolbarProps) {
  const [csvCopied, setCsvCopied] = useState(false)
  const [summaryCopied, setSummaryCopied] = useState(false)
  const [readmeOpened, setReadmeOpened] = useState(false)
  const [exportScope, setExportScope] = useState<'visible' | 'all'>('visible')

  const activeColumns = exportScope === 'visible'
    ? COLUMNS.filter(c => visibleColumns.includes(c.id))
    : COLUMNS

  const handleDownloadCsv = () => {
    downloadColumnCsv(records, activeColumns, 'contact-metrics-filtered.csv')
  }

  const handleCopyTable = async () => {
    const tsv = columnRowsToTsv(records, activeColumns)
    await copyToClipboard(tsv)
    setCsvCopied(true)
    setTimeout(() => setCsvCopied(false), 1800)
  }

  const handleCopySummary = async () => {
    const text = formatSummaryText(metrics, filterLabel, totalRecords, filteredRecords)
    await copyToClipboard(text)
    setSummaryCopied(true)
    setTimeout(() => setSummaryCopied(false), 1800)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm">
            <Tooltip label="Download filtered data as CSV (for Excel)">
              <Button
                variant="light"
                color="blue"
                leftSection={<IconDownload size={16} />}
                onClick={handleDownloadCsv}
                size="sm"
              >
                Download CSV
              </Button>
            </Tooltip>
            <Tooltip label="Copy table as tab-separated values (paste into Excel)">
              <Button
                variant="light"
                color={csvCopied ? 'teal' : 'gray'}
                leftSection={csvCopied ? <IconCheck size={16} /> : <IconTable size={16} />}
                onClick={handleCopyTable}
                size="sm"
              >
                {csvCopied ? 'Copied!' : 'Copy Table'}
              </Button>
            </Tooltip>
            <Tooltip label="Copy formatted summary to clipboard (for PPT/email)">
              <Button
                variant="light"
                color={summaryCopied ? 'teal' : 'gray'}
                leftSection={summaryCopied ? <IconCheck size={16} /> : <IconClipboardText size={16} />}
                onClick={handleCopySummary}
                size="sm"
              >
                {summaryCopied ? 'Copied!' : 'Copy Summary'}
              </Button>
            </Tooltip>
            <Tooltip label="Quick start guide">
              <Button
                variant="subtle"
                color="gray"
                leftSection={<IconBook size={16} />}
                onClick={() => setReadmeOpened(true)}
                size="sm"
              >
                Readme
              </Button>
            </Tooltip>
          </Group>
          <SegmentedControl
            size="xs"
            value={exportScope}
            onChange={(v) => setExportScope(v as 'visible' | 'all')}
            data={[
              { label: 'Visible columns', value: 'visible' },
              { label: 'All columns', value: 'all' },
            ]}
          />
        </Group>
      </motion.div>

      <Modal
        opened={readmeOpened}
        onClose={() => setReadmeOpened(false)}
        title={
          <Group gap="xs">
            <IconBook size={20} />
            <Text fw={600}>Quick Start</Text>
          </Group>
        }
        size="md"
        radius="md"
      >
        <Stack gap="md" mt="xs">
          <Paper p="md" radius="md" withBorder>
            <Group gap="sm" mb={6}>
              <IconDatabase size={18} style={{ color: 'var(--mantine-color-blue-6)' }} />
              <Text fw={600} size="sm">Getting the data</Text>
            </Group>
            <Text size="sm" c="dimmed" lh={1.6}>
              Go to <b>Amazon Connect Console → Analytics and Optimization → Contact Search</b>, set filters and date range, then <b>Export → Download CSV</b>.
            </Text>
            <Text size="sm" c="dimmed" lh={1.6} mt={4}>
              For phone numbers: <b>Amazon Connect Console → Phone Numbers</b>, export as CSV.
            </Text>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group gap="sm" mb={6}>
              <IconChartBar size={18} style={{ color: 'var(--mantine-color-teal-6)' }} />
              <Text fw={600} size="sm">Metrics</Text>
            </Group>
            <Text size="sm" c="dimmed" lh={1.6}>
              <b>Agent Connect Time</b> — <code>connectedToAgentTimestamp - initiationTimestamp</code><br />
              <b>Handle Time</b> — <code>agentInteractionDuration</code><br />
              <b>After ACW Time</b> — <code>acwEndTimestamp - acwStartTimestamp</code>
            </Text>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group gap="sm" mb={6}>
              <IconFilter size={18} style={{ color: 'var(--mantine-color-purple-6)' }} />
              <Text fw={600} size="sm">Filtering</Text>
            </Group>
            <Text size="sm" c="dimmed" lh={1.6}>
              Narrow results by <b>Routing Profile</b>, <b>Initiation Method</b>, or <b>Phone Description</b>. Cards and summary update instantly.
            </Text>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group gap="sm" mb={6}>
              <IconFileExport size={18} style={{ color: 'var(--mantine-color-orange-6)' }} />
              <Text fw={600} size="sm">Export</Text>
            </Group>
            <Text size="sm" c="dimmed" lh={1.6}>
              Download CSV, copy table values, or copy a formatted summary for presentations and email. Use <b>Visible columns</b> to export only what you see, or <b>All columns</b> to include derived metrics like connect time, queue time, and SLA flags.
            </Text>
          </Paper>
        </Stack>
      </Modal>
    </>
  )
}