import { ContactRecord, DetailedMetrics } from '../types'

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function downloadCsv(records: ContactRecord[], filename: string): void {
  if (records.length === 0) return
  const keys = Object.keys(records[0]) as (keyof ContactRecord)[]
  const header = keys.join(',')
  const rows = records.map((r) =>
    keys.map((k) => {
      const val = r[k] ?? ''
      const str = String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function rowsToTsv(records: ContactRecord[]): string {
  if (records.length === 0) return ''
  const keys = Object.keys(records[0]) as (keyof ContactRecord)[]
  const header = keys.join('\t')
  const rows = records.map((r) =>
    keys.map((k) => String(r[k] ?? '')).join('\t')
  )
  return [header, ...rows].join('\n')
}

export function formatMetricLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase())
}

export function formatSummaryText(
  metrics: DetailedMetrics,
  filterLabel: string,
  totalRecords: number,
  filteredRecords: number
): string {
  const lines: string[] = []
  lines.push('Contact Metrics Summary')
  lines.push('' + '-'.repeat(60))
  if (filterLabel) lines.push(`Filter: ${filterLabel}`)
  lines.push(`Records: ${filteredRecords} of ${totalRecords}`)
  lines.push('')

  const header = 'Metric'.padEnd(28) + 'Avg'.padEnd(10) + 'Min'.padEnd(10) + 'Max'.padEnd(10) + 'Median'.padEnd(10) + 'N'
  lines.push(header)
  lines.push('' + '-'.repeat(60))

  const entries: Array<{ label: string; stats: { avg: number; min: number; max: number; median: number; count: number } | null }> = [
    { label: 'Agent Connect Time', stats: metrics.agentConnectTime },
    { label: 'Handle Time', stats: metrics.handleTime },
    { label: 'After ACW Time', stats: metrics.acwTime },
  ]

  for (const { label, stats } of entries) {
    if (stats) {
      const row =
        label.padEnd(28) +
        stats.avg.toFixed(2).padStart(8) + '  ' +
        stats.min.toFixed(2).padStart(8) + '  ' +
        stats.max.toFixed(2).padStart(8) + '  ' +
        stats.median.toFixed(2).padStart(8) + '  ' +
        String(stats.count).padStart(4)
      lines.push(row)
    } else {
      lines.push(label.padEnd(28) + '  \u2014')
    }
  }

  return lines.join('\n')
}
