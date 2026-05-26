import { useState } from 'react'
import { Group, Button, Tooltip } from '@mantine/core'
import { motion } from 'framer-motion'
import { IconDownload, IconTable, IconClipboardText, IconCheck } from '@tabler/icons-react'
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
      </Group>
    </motion.div>
  )
}
