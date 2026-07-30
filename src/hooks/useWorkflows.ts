import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Workflow } from '../types/review'

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) setError(error.message)
    else setWorkflows((data ?? []) as Workflow[])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async (input: Partial<Workflow>): Promise<Workflow | null> => {
    const { data, error } = await supabase
      .from('workflows')
      .insert({
        name: input.name ?? 'Untitled workflow',
        description: input.description ?? null,
        is_enabled: input.is_enabled ?? true,
        granularity: input.granularity ?? 'per_call',
        group_by: input.group_by ?? null,
        conditions: input.conditions ?? { type: 'and', children: [] },
        assign_to: input.assign_to ?? null,
      })
      .select('*')
      .single()
    if (error) { setError(error.message); return null }
    await refresh()
    return data as Workflow
  }, [refresh])

  const update = useCallback(async (id: string, patch: Partial<Workflow>): Promise<boolean> => {
    const { error } = await supabase
      .from('workflows')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { setError(error.message); return false }
    await refresh()
    return true
  }, [refresh])

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('workflows').delete().eq('id', id)
    if (error) { setError(error.message); return false }
    await refresh()
    return true
  }, [refresh])

  return { workflows, loading, error, refresh, create, update, remove }
}
