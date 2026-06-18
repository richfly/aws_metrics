import { Paper, Stack, SimpleGrid, Group, Skeleton } from '@mantine/core'
import { motion } from 'framer-motion'

interface ContentSkeletonProps {
  showCharts?: boolean
  showTable?: boolean
}

export function ContentSkeleton({ showCharts = true, showTable = true }: ContentSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Paper shadow="sm" radius="md" p="md" className="glass-panel">
        <Stack gap="xl">
          <SimpleGrid cols={{ base: 1, sm: 4 }}>
            <Skeleton height={110} radius="md" />
            <Skeleton height={110} radius="md" />
            <Skeleton height={110} radius="md" />
            <Skeleton height={110} radius="md" />
          </SimpleGrid>

          {showCharts && (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Stack gap="xs">
                <Skeleton height={14} width="40%" radius="sm" />
                <Skeleton height={12} width="60%" radius="sm" />
                <Skeleton height={220} radius="md" mt={4} />
              </Stack>
              <Stack gap="xs">
                <Skeleton height={14} width="40%" radius="sm" />
                <Skeleton height={12} width="60%" radius="sm" />
                <Skeleton height={220} radius="md" mt={4} />
              </Stack>
            </SimpleGrid>
          )}

          {showTable && (
            <Stack gap="xs">
              <Skeleton height={14} width="30%" radius="sm" />
              <Group gap="xs">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height={32} radius="sm" style={{ flex: 1 }} />
                ))}
              </Group>
              {Array.from({ length: 5 }).map((_, rowIdx) => (
                <Group key={rowIdx} gap="xs">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} height={20} radius="sm" style={{ flex: 1 }} />
                  ))}
                </Group>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>
    </motion.div>
  )
}
