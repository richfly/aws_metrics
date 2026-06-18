import { useState, useEffect } from 'react'
import { Popover, TextInput, Stack, Group, Button } from '@mantine/core'
import { DatePicker, type DatePickerProps } from '@mantine/dates'
import { IconCalendar } from '@tabler/icons-react'

export interface DatePreset {
  label: string
  value: Date | [Date, Date]
}

interface DatePickerPopoverProps {
  mode: 'single' | 'range'
  value: [Date | null, Date | null]
  onChange: (v: [Date | null, Date | null]) => void
  presets: DatePreset[]
  renderDay?: DatePickerProps['renderDay']
  placeholder?: string
}

function formatValue(value: [Date | null, Date | null], mode: 'single' | 'range'): string {
  const fmt = (d: Date) => d.toLocaleDateString()
  if (mode === 'single') {
    return value[0] ? fmt(value[0]) : ''
  }
  if (value[0] && value[1]) {
    return `${fmt(value[0])} – ${fmt(value[1])}`
  }
  if (value[0]) {
    return `From ${fmt(value[0])}`
  }
  if (value[1]) {
    return `To ${fmt(value[1])}`
  }
  return ''
}

export function DatePickerPopover({
  mode,
  value,
  onChange,
  presets,
  renderDay,
  placeholder,
}: DatePickerPopoverProps) {
  const [opened, setOpened] = useState(false)
  const [draft, setDraft] = useState<[Date | null, Date | null]>(value)

  useEffect(() => {
    if (opened) {
      setDraft(value)
    }
  }, [opened, value])

  const applyPreset = (preset: DatePreset) => {
    if (mode === 'single') {
      const d = preset.value as Date
      const newVal: [Date | null, Date | null] = [d, d]
      onChange(newVal)
    } else {
      const [start, end] = preset.value as [Date, Date]
      onChange([start, end])
    }
    setOpened(false)
  }

  const handleDateChange = (newDraft: [Date | null, Date | null]) => {
    setDraft(newDraft)
    if (mode === 'range') {
      if (newDraft[0] && newDraft[1]) {
        onChange(newDraft)
        setOpened(false)
      }
    } else {
      if (newDraft[0]) {
        onChange([newDraft[0], newDraft[0]])
        setOpened(false)
      }
    }
  }

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      width="auto"
      shadow="md"
      trapFocus
    >
      <Popover.Target>
        <TextInput
          value={formatValue(value, mode)}
          placeholder={placeholder}
          leftSection={<IconCalendar size={16} />}
          readOnly
          onClick={() => setOpened((o) => !o)}
          styles={{ input: { cursor: 'pointer' } }}
        />
      </Popover.Target>
      <Popover.Dropdown p="md">
        <Group align="flex-start" gap="md" wrap="nowrap">
          <Stack gap={4} miw={120}>
            {presets.map((preset, idx) => (
              <Button
                key={idx}
                size="xs"
                variant="subtle"
                color="gray"
                justify="flex-start"
                onClick={() => applyPreset(preset)}
                fullWidth
              >
                {preset.label}
              </Button>
            ))}
          </Stack>
          {mode === 'range' ? (
            <DatePicker
              type="range"
              value={draft}
              onChange={(v) =>
                handleDateChange((v ?? [null, null]) as [Date | null, Date | null])
              }
              renderDay={renderDay}
            />
          ) : (
            <DatePicker
              type="default"
              value={draft[0]}
              onChange={(d) => handleDateChange(d ? [d, d] : [null, null])}
              renderDay={renderDay}
            />
          )}
        </Group>
      </Popover.Dropdown>
    </Popover>
  )
}
