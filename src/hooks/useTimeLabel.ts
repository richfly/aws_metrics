import { useState, useRef, useEffect } from 'react'

export interface TimeLabelState {
  freshLabel: string | null
  lastUploadInfo: { count: number; label: string } | null
  setLastUploadInfo: (info: { count: number; label: string } | null) => void
}

export function useTimeLabel(dataLoadedAt: Date | null): TimeLabelState {
  const [freshLabel, setFreshLabel] = useState<string | null>(null)
  const [lastUploadInfo, setLastUploadInfo] = useState<{ count: number; label: string } | null>(null)
  const refreshInterval = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!dataLoadedAt) {
      setFreshLabel(null)
      return
    }
    const update = () => {
      const secs = Math.floor((Date.now() - dataLoadedAt.getTime()) / 1000)
      const prefix = lastUploadInfo
        ? `${lastUploadInfo.count.toLocaleString()} ${lastUploadInfo.label} loaded`
        : "Loaded"
      if (secs < 60) setFreshLabel(`${prefix} just now`)
      else if (secs < 120) setFreshLabel(`${prefix} 1 min ago`)
      else setFreshLabel(`${prefix} ${Math.floor(secs / 60)} min ago`)
    }
    update()
    refreshInterval.current = window.setInterval(update, 30000)
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current)
    }
  }, [dataLoadedAt, lastUploadInfo])

  return { freshLabel, lastUploadInfo, setLastUploadInfo }
}
