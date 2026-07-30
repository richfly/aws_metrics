import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { runWorkflow } from '../lib/workflowEngine'
import type { Workflow } from '../types/review'
import type { ContactRecord } from '../types'

interface MaterializeOptions {
  workflows: Workflow[]
  records: ContactRecord[]
  reviewers: { id: string }[]
}

export function useWorkflowMaterializer({ workflows, records, reviewers }: MaterializeOptions) {
  const running = useRef(false)
  const lastSignature = useRef<string>('')

  useEffect(() => {
    const enabled = workflows.filter((w) => w.is_enabled)
    if (enabled.length === 0) return
    if (records.length === 0) return
    if (reviewers.length === 0) return

    const sig = `${records.length}:${enabled.map((w) => `${w.id}:${w.updated_at}`).join('|')}`
    if (sig === lastSignature.current) return
    lastSignature.current = sig

    if (running.current) return
    running.current = true

    ;(async () => {
      try {
        for (const wf of enabled) {
          const result = runWorkflow(records, wf.conditions, wf.granularity, wf.group_by)
          const reviewerId = wf.assign_to ?? reviewers[0].id
          if (wf.granularity === 'per_call') {
            await materializePerCall(wf.id, result.perCall, reviewerId)
          } else if (wf.group_by) {
            await materializePerGroup(wf.id, result.perGroup, reviewerId)
          }
        }
      } catch (e) {
        console.error('[workflow] materialization failed:', e)
      } finally {
        running.current = false
      }
    })()
  }, [workflows, records, reviewers])
}

async function materializePerCall(workflowId: string, matching: ContactRecord[], reviewerId: string) {
  if (matching.length === 0) return
  const rows = matching.map((r) => ({
    workflow_id: workflowId,
    group_key: r.contactId,
    contact_ids: [r.contactId],
    reviewer_id: reviewerId,
  }))
  const { error } = await supabase
    .from('assignments')
    .upsert(rows, { onConflict: 'workflow_id,group_key' })
  if (error) console.warn('[workflow] per_call upsert failed:', error.message)
}

async function materializePerGroup(
  workflowId: string,
  groups: Map<string, ContactRecord[]>,
  reviewerId: string,
) {
  if (groups.size === 0) return
  const rows = Array.from(groups.entries()).map(([key, recs]) => ({
    workflow_id: workflowId,
    group_key: key,
    contact_ids: recs.map((r) => r.contactId),
    reviewer_id: reviewerId,
  }))
  const { error } = await supabase
    .from('assignments')
    .upsert(rows, { onConflict: 'workflow_id,group_key' })
  if (error) console.warn('[workflow] per_group upsert failed:', error.message)
}
