import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import posthog from '../lib/posthog'
import type { Session, AuthError } from '@supabase/supabase-js'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const identifiedUserId = useRef<string | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setLoading(false)

      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && nextSession) {
        if (identifiedUserId.current && identifiedUserId.current !== nextSession.user.id) {
          posthog.reset()
        }

        if (identifiedUserId.current !== nextSession.user.id) {
          const isNewUser = event === 'SIGNED_IN'
          posthog.identify(
            nextSession.user.id,
            nextSession.user.email ? { email: nextSession.user.email } : undefined,
          )
          posthog.setPersonProperties({
            email: nextSession.user.email ?? null,
            last_login_at: new Date().toISOString(),
            ...(isNewUser ? { signup_at: new Date().toISOString() } : {}),
          })
          posthog.capture('user_identified', {
            is_new_user: isNewUser,
          })
          identifiedUserId.current = nextSession.user.id
        }
      }

      if (event === 'SIGNED_OUT') {
        posthog.reset()
        identifiedUserId.current = null
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
