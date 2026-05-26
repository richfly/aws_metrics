import { useEffect, useState } from 'react'
import { Paper, Text, Group, ActionIcon } from '@mantine/core'
import { motion } from 'framer-motion'
import { IconCopy, IconCheck } from '@tabler/icons-react'
import { MetricStats } from '../types'
import { copyToClipboard } from '../utils/exportUtils'

interface BigNumberCardProps {
  label: string
  stats?: MetricStats | null
  value?: number | null
  index?: number
}

function AnimatedNumber({ target, integer }: { target: number | null; integer?: boolean }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (target === null) return
    setDisplay(0)

    const duration = 1400
    const start = performance.now()
    let frame: number

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - (1 - progress) * (1 - progress) * (1 - progress)
      setDisplay(target * eased)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  if (target === null) return null
  return <>{integer ? Math.round(display).toLocaleString() : display.toFixed(2)}</>
}

export function BigNumberCard({
  label,
  stats,
  value: directValue,
  index = 0,
}: BigNumberCardProps) {
  const [copied, setCopied] = useState(false)
  const value = directValue ?? stats?.avg ?? null
  const isCounter = directValue !== undefined

  const handleCopy = async () => {
    if (value === null) return
    const text = isCounter ? String(Math.round(value)) : value.toFixed(2)
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      style={{ height: '100%' }}
    >
      <Paper
        shadow="sm"
        radius="xl"
        p="lg"
        className="metric-card glass-panel"
        style={{
          height: '100%',
          position: 'relative',
        }}
      >
        {value !== null && (
          <div style={{ position: 'absolute', top: 12, right: 14 }}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={handleCopy}
              style={{ opacity: 0.3, transition: 'opacity 0.2s' }}
              className="copy-btn-hover"
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          </div>
        )}

        <Group justify="center" mt={2}>
          <Text className="card-number">
            <AnimatedNumber target={value} integer={isCounter} />
          </Text>
        </Group>

        <Text ta="center" size="xs" c="dimmed" tt="uppercase" fw={500} lh={1.4}>
          {label}
        </Text>
      </Paper>
    </motion.div>
  )
}
