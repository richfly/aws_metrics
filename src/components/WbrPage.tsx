import { Stack, Alert, Text, Group } from '@mantine/core'
import { motion } from 'framer-motion'
import { ContactRecord, DetailedMetrics } from '../types'
import { ExecutiveSummary } from './ExecutiveSummary'
import { ExportToolbar } from './ExportToolbar'
import { BigNumberCard } from './BigNumberCard'
import { MetricsSummary } from './MetricsSummary'
import { MetricsTable } from './MetricsTable'

interface WbrPageProps {
  records: ContactRecord[]
  totalRecords: number
  filteredRecords: number
  metrics: DetailedMetrics | null
  overallMetrics: DetailedMetrics | null
  filterLabel: string
  missingDescriptionCount: number
  contactRecordsLength: number
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
}

export function WbrPage({
  records,
  totalRecords,
  filteredRecords,
  metrics,
  overallMetrics,
  filterLabel,
  missingDescriptionCount,
  contactRecordsLength,
}: WbrPageProps) {
  return (
    <Stack gap="md">
      {totalRecords > 0 && (
        <>
          {metrics && (
            <ExecutiveSummary
              metrics={metrics}
              overallMetrics={overallMetrics}
              totalRecords={totalRecords}
              filteredRecords={filteredRecords}
              filterLabel={filterLabel}
            />
          )}

          {metrics && (
            <ExportToolbar
              records={records}
              metrics={metrics}
              totalRecords={totalRecords}
              filteredRecords={filteredRecords}
              filterLabel={filterLabel}
            />
          )}

          {metrics && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <Group grow>
                <BigNumberCard
                  label="Records"
                  value={filteredRecords}
                  index={0}
                />
                <BigNumberCard
                  label="Avg Agent Connect Time"
                  stats={metrics.agentConnectTime}
                  index={1}
                />
                <BigNumberCard
                  label="Avg Handle Time"
                  stats={metrics.handleTime}
                  index={2}
                />
                <BigNumberCard
                  label="Avg After ACW Time"
                  stats={metrics.acwTime}
                  index={3}
                />
              </Group>
            </motion.div>
          )}

          {metrics && (
            <MetricsSummary
              metrics={metrics}
              totalRecords={totalRecords}
              filteredRecords={filteredRecords}
              filterLabel={filterLabel}
            />
          )}

          {records.length > 0 && <MetricsTable records={records} />}

          {missingDescriptionCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <Alert color="yellow" variant="light" radius="md">
                <Group gap="xs">
                  <Text fw={600}>
                    {missingDescriptionCount.toLocaleString()} records
                  </Text>
                  <Text c="dimmed">
                    have no phone description — the Phone Description filter
                    will not show those entries
                  </Text>
                </Group>
              </Alert>
            </motion.div>
          )}
        </>
      )}

      {contactRecordsLength > 0 && !metrics && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Alert color="blue" variant="light" radius="md">
            <Group gap="xs">
              <Text fw={600}>
                {contactRecordsLength.toLocaleString()} contact records
              </Text>
              <Text c="dimmed">
                loaded — no metrics available (timestamps may be empty)
              </Text>
            </Group>
          </Alert>
        </motion.div>
      )}
    </Stack>
  )
}
