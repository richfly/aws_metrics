import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Assignment, AssignmentEvent, AssignmentState } from '../types/review'

export function useAssignments(reviewerId: string | null) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!reviewerId) {
      setAssignments([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('reviewer_id', reviewerId)
      .order('updated_at', { ascending: false })
    if (error) setError(error.message)
    else setAssignments((data ?? []) as Assignment[])
    setLoading(false)
  }, [reviewerId])

  useEffect(() => { refresh() }, [refresh])

  const transition = useCallback(async (
    assignmentId: string,
    toState: AssignmentState,
    note: string | null,
    actorId: string | null,
  ): Promise<boolean> => {
    const { data: current, error: readErr } = await supabase
      .from('assignments')
      .select('state')
      .eq('id', assignmentId)
      .single()
    if (readErr || !current) {
      setError(readErr?.message ?? 'Could not read assignment')
      return false
    }
    const fromState = current.state as AssignmentState

    const { error: updateErr } = await supabase
      .from('assignments')
      .update({ state: toState, updated_at: new Date().toISOString() })
      .eq('id', assignmentId)
    if (updateErr) { setError(updateErr.message); return false }

    const { error: eventErr } = await supabase.from('assignment_events').insert({
      assignment_id: assignmentId,
      from_state: fromState,
      to_state: toState,
      note: note ?? null,
      actor_id: actorId,
    })
    if (eventErr) console.warn('[assignments] event insert failed:', eventErr)

    await refresh()
    return true
  }, [refresh])

  return { assignments, loading, error, refresh, transition }
}

export function useAssignmentEvents(assignmentId: string | null) {
  const [events, setEvents] = useState<AssignmentEvent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!assignmentId) { setEvents([]); return }
    let cancelled = false
    setLoading(true)
    supabase
      .from('assignment_events')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setEvents((data ?? []) as AssignmentEvent[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [assignmentId])

  return { events, loading }
}
