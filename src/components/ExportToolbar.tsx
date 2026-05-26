import { useState } from 'react'
import { Group, Button, Tooltip, Modal, Text, Divider } from '@mantine/core'
import { motion } from 'framer-motion'
import { IconDownload, IconTable, IconClipboardText, IconCheck, IconBook } from '@tabler/icons-react'
import { ContactRecord, DetailedMetrics } from '../types'
import { downloadCsv, rowsToTsv, copyToClipboard, formatSummaryText } from '../utils/exportUtils'

interface ExportToolbarProps {
  records: ContactRecord[]
  metrics: DetailedMetrics
  totalRecords: number
  filteredRecords: number
  filterLabel: string
}

export function ExportToolbar({ records, metrics, totalRecords, filteredRecords, filterLabel }: ExportToolbarProps) {
  const [csvCopied, setCsvCopied] = useState(false)
  const [summaryCopied, setSummaryCopied] = useState(false)
  const [readmeOpened, setReadmeOpened] = useState(false)

  const handleDownloadCsv = () => {
    downloadCsv(records, 'contact-metrics-filtered.csv')
  }

  const handleCopyTable = async () => {
    const tsv = rowsToTsv(records)
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
      </motion.div>

      <Modal
        opened={readmeOpened}
        onClose={() => setReadmeOpened(false)}
        title="Quick Start"
        size="md"
        radius="xl"
      >
        <Text size="sm" lh={1.7}>
          <Text fw={600} size="sm" mb={4}>Getting the data</Text>
          Go to <b>Amazon Connect Console → Analytics and Optimization → Contact Search</b>, set your filters and date range, then click <b>Export → Download CSV</b>. For phone number details, go to <b>Amazon Connect Console → Phone Numbers</b> and export the list as CSV.

          <Divider my="sm" />

          <Text fw={600} size="sm" mb={4}>Using the dashboard</Text>
          Click <b>Load Data</b> (top-right), upload Phone Numbers CSV first (step 1), then Contact Search CSV (step 2). Metrics are computed automatically.

          <Divider my="sm" />

          <Text fw={600} size="sm" mb={4}>Metrics</Text>
          <b>Agent Connect Time</b> — connectedToAgentTimestamp minus initiationTimestamp<br />
          <b>Handle Time</b> — agent interaction duration<br />
          <b>After ACW Time</b> — acwEndTimestamp minus acwStartTimestamp

          <Divider my="sm" />

          <Text fw={600} size="sm" mb={4}>Filtering &amp; export</Text>
          Use the filter bar to narrow by routing profile, initiation method, or phone description. Export filtered results via CSV, clipboard, or formatted summary.
        </Text>
      </Modal>
    </>
  )
}
