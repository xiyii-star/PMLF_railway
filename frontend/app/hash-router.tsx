'use client'

import { useEffect, useState, useRef } from 'react'
import PipelineExecution from './pipeline-execution'
import ResultDetails from './result-detail'

export default function HashRouter() {
  const [route, setRoute] = useState<{ path: string; id?: string } | null>(null)
  const previousRouteRef = useRef<string | null>(null)

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) // Remove #
      if (!hash || hash === '/') {
        setRoute(null)
        previousRouteRef.current = null
        return
      }

      // Parse hash routes
      const pipelineMatch = hash.match(/^\/pipeline\/([^/]+)$/)
      const resultsMatch = hash.match(/^\/results\/([^/]+)$/)

      // 只在路由真正改变时滚动
      const currentRouteKey = hash
      if (previousRouteRef.current !== currentRouteKey) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        previousRouteRef.current = currentRouteKey
      }

      if (pipelineMatch) {
        setRoute({ path: 'pipeline', id: pipelineMatch[1] })
      } else if (resultsMatch) {
        setRoute({ path: 'results', id: resultsMatch[1] })
      } else {
        setRoute(null)
      }
    }

    // Initial load
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Don't render anything if no hash route
  if (!route) {
    return null
  }

  // Render the appropriate component based on route
  if (route.path === 'pipeline' && route.id) {
    return <PipelineExecution taskId={route.id} />
  }

  if (route.path === 'results' && route.id) {
    return <ResultDetails taskId={route.id} />
  }

  return null
}
