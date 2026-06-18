import { useState } from 'react'
import { ActionIcon, Tooltip, Loader } from '@mantine/core'
import { IconDownload } from '@tabler/icons-react'
import html2canvas from 'html2canvas'

interface ChartExportButtonProps {
  /** Ref or ID of the element to capture. */
  targetRef: React.RefObject<HTMLElement | null>
  /** Filename without extension. */
  filename: string
  /** Optional background color (defaults to white). */
  backgroundColor?: string
}

export function ChartExportButton({
  targetRef,
  filename,
  backgroundColor = "#ffffff",
}: ChartExportButtonProps) {
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    const target = targetRef.current
    if (!target || busy) return
    setBusy(true)
    try {
      const canvas = await html2canvas(target, {
        backgroundColor,
        scale: 2,
        logging: false,
        useCORS: true,
      })
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      )
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${filename}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("[export] PNG download failed:", err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Tooltip label="Download as PNG">
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        onClick={handleClick}
        disabled={busy}
        aria-label={`Download ${filename} as PNG`}
      >
        {busy ? <Loader size="xs" color="gray" /> : <IconDownload size={16} />}
      </ActionIcon>
    </Tooltip>
  )
}
