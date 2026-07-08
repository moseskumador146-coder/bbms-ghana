'use client'
import { useState, useEffect, useCallback } from 'react'

export type Route = {
  page: string
  params: Record<string, string>
}

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return { page: 'dashboard', params: {} }
  const [path, query] = hash.split('?')
  const segments = path.split('/').filter(Boolean)
  const page = segments[0] || 'dashboard'
  const params: Record<string, string> = {}
  if (query) {
    for (const kv of query.split('&')) {
      const [k, v] = kv.split('=')
      params[decodeURIComponent(k)] = decodeURIComponent(v ?? '')
    }
  }
  // Allow page/sub-id format: e.g. "blood-units/abc123"
  if (segments.length > 1) {
    params.id = segments[1]
  }
  return { page, params }
}

export function useRouter() {
  const [route, setRoute] = useState<Route>({ page: 'dashboard', params: {} })

  useEffect(() => {
    setRoute(parseHash())
    const handler = () => setRoute(parseHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const navigate = useCallback((to: string) => {
    if (window.location.hash === `#${to}`) {
      setRoute(parseHash())
    } else {
      window.location.hash = to
    }
  }, [])

  return { route, navigate }
}
