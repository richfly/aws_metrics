import { PhoneDescriptionGroup } from './metricsCalculator'
import { formatMinutes } from './metricsCalculator'

export interface QueryResult {
  title: string
  lines: string[]
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

function findGroup(
  groups: PhoneDescriptionGroup[],
  name: string,
): PhoneDescriptionGroup | undefined {
  const q = normalize(name)
  return groups.find(
    (g) => normalize(g.phoneDescription).includes(q) || q.includes(normalize(g.phoneDescription)),
  )
}

function findGroups(
  groups: PhoneDescriptionGroup[],
  name: string,
): PhoneDescriptionGroup[] {
  const q = normalize(name)
  return groups.filter(
    (g) => normalize(g.phoneDescription).includes(q) || q.includes(normalize(g.phoneDescription)),
  )
}

type MetricKey = 'avgConnectTime' | 'avgHandleTime' | 'avgAcwTime'
type MetricLabel = 'connect' | 'handle' | 'acw'

function parseMetric(word: string): { key: MetricKey; label: MetricLabel } | null {
  const w = normalize(word)
  if (/connect|speed/.test(w)) return { key: 'avgConnectTime', label: 'connect' }
  if (/handle/.test(w)) return { key: 'avgHandleTime', label: 'handle' }
  if (/acw|after.*call|wrap/.test(w)) return { key: 'avgAcwTime', label: 'acw' }
  return null
}

function bestInMetric(
  groups: PhoneDescriptionGroup[],
  metric: MetricKey,
  prefer: 'min' | 'max',
): { group: PhoneDescriptionGroup; value: number } | null {
  if (groups.length === 0) return null
  const cmp = prefer === 'min'
    ? (a: number, b: number) => a - b
    : (a: number, b: number) => b - a
  let best = groups[0]
  let bestVal = best[metric]
  for (let i = 1; i < groups.length; i++) {
    const v = groups[i][metric]
    if (cmp(v, bestVal) < 0) {
      bestVal = v
      best = groups[i]
    }
  }
  return { group: best, value: bestVal }
}

function isVolumeQuery(q: string): boolean {
  return /calls|records|volume|contacts|busy|quiet/.test(q)
}

function bestByCount(
  groups: PhoneDescriptionGroup[],
  prefer: 'min' | 'max',
): { group: PhoneDescriptionGroup; value: number } | null {
  if (groups.length === 0) return null
  const cmp = prefer === 'min'
    ? (a: number, b: number) => a - b
    : (a: number, b: number) => b - a
  let best = groups[0]
  let bestVal = best.count
  for (let i = 1; i < groups.length; i++) {
    const v = groups[i].count
    if (cmp(v, bestVal) < 0) {
      bestVal = v
      best = groups[i]
    }
  }
  return { group: best, value: bestVal }
}

export function parseQuestion(
  query: string,
  groups: PhoneDescriptionGroup[],
): QueryResult | null {
  const q = normalize(query)
  if (!q || q.length < 3 || groups.length === 0) return null

  const metric = parseMetric(q)
  const nameMatch = findGroup(groups, query)
  const volume = isVolumeQuery(q)

  if (/^what.*|^which.*|^show.*|^tell.*/.test(q)) {
    if (/top\s+(\d+)/.test(q)) {
      const n = parseInt(q.match(/top\s+(\d+)/)![1], 10)
      if (volume) {
        const sorted = [...groups].sort((a, b) => b.count - a.count).slice(0, n)
        return {
          title: `Top ${n} phone descriptions by volume`,
          lines: sorted.map((g, i) =>
            `  ${i + 1}. ${g.phoneDescription} \u2014 ${g.count.toLocaleString()} records`,
          ),
        }
      }
      const mk = metric?.key ?? 'avgConnectTime'
      const ml = metric?.label ?? 'connect'
      const sorted = [...groups].sort((a, b) => b[mk] - a[mk]).slice(0, n)
      return {
        title: `Top ${n} phone descriptions by avg ${ml} time`,
        lines: sorted.map((g, i) => {
          const v = formatMinutes(g[mk])
          return `  ${i + 1}. ${g.phoneDescription} \u2014 ${v}`
        }),
      }
    }

    if (volume && (/most|busiest/.test(q) || (metric && /best|lowest|fastest/.test(q) && volume))) {
      const r = bestByCount(groups, 'max')
      if (!r) return null
      return {
        title: 'Busiest phone description',
        lines: [`  ${r.group.phoneDescription} \u2014 ${r.value.toLocaleString()} records`],
      }
    }

    if (volume && (/least|quiet/.test(q) || (metric && /worst|highest|slowest/.test(q) && volume))) {
      const r = bestByCount(groups, 'min')
      if (!r) return null
      return {
        title: 'Quietest phone description',
        lines: [`  ${r.group.phoneDescription} \u2014 ${r.value.toLocaleString()} records`],
      }
    }

    if (/best|lowest|fastest/.test(q)) {
      const mk = metric?.key ?? 'avgConnectTime'
      const ml = metric?.label ?? 'connect'
      const r = bestInMetric(groups, mk, 'min')
      if (!r) return null
      return {
        title: `Best avg ${ml} time`,
        lines: [`  ${r.group.phoneDescription} \u2014 ${formatMinutes(r.value)}`],
      }
    }

    if (/worst|highest|slowest/.test(q)) {
      const mk = metric?.key ?? 'avgConnectTime'
      const ml = metric?.label ?? 'connect'
      const r = bestInMetric(groups, mk, 'max')
      if (!r) return null
      return {
        title: `Worst avg ${ml} time`,
        lines: [`  ${r.group.phoneDescription} \u2014 ${formatMinutes(r.value)}`],
      }
    }

    if (/more\s+than|over|>|greater/.test(q) || /less\s+than|under|<|fewer/.test(q)) {
      const nums = q.match(/\d+/)
      if (!nums) return null
      const threshold = parseInt(nums[0], 10)
      const isMore = /more\s+than|over|>|greater/.test(q)
      const filtered = groups.filter((g) => isMore ? g.count > threshold : g.count < threshold)
      if (filtered.length === 0) {
        return {
          title: 'No results',
          lines: [`  No phone descriptions with ${isMore ? 'more' : 'less'} than ${threshold} records`],
        }
      }
      return {
        title: `Phone descriptions with ${isMore ? 'more' : 'less'} than ${threshold} records`,
        lines: filtered.map((g) => `  ${g.phoneDescription} \u2014 ${g.count.toLocaleString()} records`),
      }
    }

    if (/how\s+many|calls|records|volume|contacts/.test(q) && nameMatch) {
      return {
        title: `Volume for ${nameMatch.phoneDescription}`,
        lines: [`  ${nameMatch.count.toLocaleString()} total records`],
      }
    }

    if (metric) {
      const mk = metric.key
      const ml = metric.label
      const r = bestInMetric(groups, mk, 'max')
      if (!r) return null
      return {
        title: `All avg ${ml} times`,
        lines: groups.map((g) => `  ${g.phoneDescription}: ${formatMinutes(g[mk])}`),
      }
    }
  }

  if (/compare|vs|versus|difference/.test(q)) {
    const parts = q.split(/vs|versus|compare|and|with/).slice(1)
    const names = parts.map((s) => s.trim()).filter(Boolean)
    const found = names.flatMap((n) => findGroups(groups, n))
    const unique = found.filter((g, i, a) => a.indexOf(g) === i).slice(0, 5)
    if (unique.length >= 2) {
      const mk = metric?.key ?? 'avgConnectTime'
      const ml = metric?.label ?? 'connect'
      return {
        title: `Comparing avg ${ml} time`,
        lines: unique.map((g) => {
          const v = formatMinutes(g[mk])
          return `  ${g.phoneDescription}: ${v} (${g.count.toLocaleString()} records)`
        }),
      }
    }
  }

  if (/average|avg|mean/.test(q) || metric) {
    if (nameMatch && metric) {
      return {
        title: `Avg ${metric.label} time for ${nameMatch.phoneDescription}`,
        lines: [`  ${formatMinutes(nameMatch[metric.key])}`],
      }
    }
    if (nameMatch) {
      return {
        title: `Metrics for ${nameMatch.phoneDescription}`,
        lines: [
          `  Connect: ${formatMinutes(nameMatch.avgConnectTime)}`,
          `  Handle: ${formatMinutes(nameMatch.avgHandleTime)}`,
          `  ACW: ${formatMinutes(nameMatch.avgAcwTime)}`,
          `  Records: ${nameMatch.count.toLocaleString()}`,
        ],
      }
    }
    if (metric) {
      return {
        title: `All avg ${metric.label} times`,
        lines: groups.map((g) => `  ${g.phoneDescription}: ${formatMinutes(g[metric.key])}`),
      }
    }
  }

  return null
}
