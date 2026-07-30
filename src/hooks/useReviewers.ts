import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SEED_REVIEWERS } from '../lib/seedReviewers'
import type { Reviewer } from '../types/review'

const STORAGE_KEY = 'aws_metrics:current_reviewer_id'

export function useReviewers() {
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReviewers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('reviewers')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) {
      setError(error.message)
      setReviewers([])
    } else if (!data || data.length === 0) {
      const seeded = await seedReviewers()
      setReviewers(seeded)
    } else {
      setReviewers(data as Reviewer[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchReviewers()
  }, [fetchReviewers])

  return { reviewers, loading, error, refresh: fetchReviewers }
}

async function seedReviewers(): Promise<Reviewer[]> {
  const { data, error } = await supabase
    .from('reviewers')
    .upsert(
      SEED_REVIEWERS.map((r) => ({ ...r, is_active: true })),
      { onConflict: 'name' },
    )
    .select('*')
  if (error) {
    console.error('[reviewers] seed failed:', error)
    return []
  }
  return (data as Reviewer[]).sort((a, b) => a.name.localeCompare(b.name))
}

export function useCurrentReviewer(reviewers: Reviewer[]): {
  current: Reviewer | null
  setCurrent: (id: string) => void
} {
  const [currentId, setCurrentId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (currentId && reviewers.length > 0 && !reviewers.some((r) => r.id === currentId)) {
      setCurrentId(reviewers[0].id)
    } else if (!currentId && reviewers.length > 0) {
      setCurrentId(reviewers[0].id)
    }
  }, [currentId, reviewers])

  useEffect(() => {
    if (currentId) {
      try {
        localStorage.setItem(STORAGE_KEY, currentId)
      } catch {}
    }
  }, [currentId])

  const current = reviewers.find((r) => r.id === currentId) ?? null
  return { current, setCurrent: setCurrentId }
}
