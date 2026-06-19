import { useCallback } from 'react'
import { Group, Text, rem } from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { IconUpload, IconX, IconFileTypeCsv, IconCircleCheck } from '@tabler/icons-react'
import { motion } from 'framer-motion'

interface FileUploadProps {
  label: string
  onFile: (text: string) => void
  loaded?: boolean
  uploaded?: boolean
  subtext?: string
}

export function FileUpload({ label, onFile, uploaded, subtext }: FileUploadProps) {
  const handleDrop = useCallback(
    (files: File[]) => {
      const file = files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (text) onFile(text)
      }
      reader.readAsText(file)
    },
    [onFile]
  )

  const showChecked = !!uploaded

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Dropzone
        onDrop={handleDrop}
        accept={[MIME_TYPES.csv]}
        maxFiles={1}
        className="dropzone-glow"
        style={{
          borderRadius: rem(24),
          borderStyle: 'dashed',
          borderWidth: 1.5,
          borderColor: showChecked
            ? 'var(--mantine-color-teal-5)'
            : 'var(--mantine-color-gray-4)',
          background: showChecked
            ? 'var(--mantine-color-teal-0)'
            : undefined,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
      >
        <Group justify="center" gap="lg" style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <motion.div
              initial={{ scale: 0.8, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <IconUpload
                style={{ width: rem(48), height: rem(48), color: 'var(--mantine-color-blue-6)' }}
                stroke={1.5}
              />
            </motion.div>
          </Dropzone.Accept>
          <Dropzone.Reject>
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.3 }}
            >
              <IconX
                style={{ width: rem(48), height: rem(48), color: 'var(--mantine-color-red-6)' }}
                stroke={1.5}
              />
            </motion.div>
          </Dropzone.Reject>
          <Dropzone.Idle>
            {showChecked ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              >
                <IconCircleCheck
                  style={{ width: rem(48), height: rem(48), color: 'var(--mantine-color-teal-6)' }}
                  stroke={1.5}
                />
              </motion.div>
            ) : (
              <IconFileTypeCsv
                style={{ width: rem(48), height: rem(48), color: 'var(--mantine-color-dimmed)' }}
                stroke={1.5}
              />
            )}
          </Dropzone.Idle>
          <div>
            <Text size="lg" fw={600}>
              {showChecked ? `${label} Loaded` : label}
            </Text>
            <Text size="sm" c="dimmed">
              {showChecked
                ? 'Drop a new file to add more data'
                : subtext ?? 'Drop CSV file here or click to browse'}
            </Text>
          </div>
        </Group>
      </Dropzone>
    </motion.div>
  )
}
