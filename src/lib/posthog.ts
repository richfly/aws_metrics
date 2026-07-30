import posthog from 'posthog-js'

const token = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN as string | undefined
const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined

if (token && host) {
  posthog.init(token, {
    api_host: host,
    defaults: '2026-01-30',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      recordCrossOriginIframes: false,
    },
    capture_performance: true,
    enable_recording_console_log: false,
  })

  window.addEventListener('error', (event) => {
    posthog.captureException(event.error ?? event.message, {
      source: 'window.onerror',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error
      ? event.reason
      : new Error(typeof event.reason === 'string' ? event.reason : 'Unhandled promise rejection')
    posthog.captureException(reason, { source: 'unhandledrejection' })
  })
} else if (import.meta.env.DEV) {
  const missing = !token ? 'VITE_PUBLIC_POSTHOG_PROJECT_TOKEN' : 'VITE_PUBLIC_POSTHOG_HOST'
  throw new Error(
    `${missing} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missing} is configured`,
  )
}

export default posthog
