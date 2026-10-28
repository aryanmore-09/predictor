import { useState, useEffect } from 'react'

export function useQuery<T = any>(
  fetcher: (() => Promise<{ data: T }>) | null,
  options?: { refreshInterval?: number }
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (!fetcher) {
      setLoading(false)
      return
    }

    let isMounted = true

    const doFetch = async () => {
      try {
        const res = await fetcher()
        if (isMounted) setData(res.data)
      } catch (err) {
        if (isMounted) setError(err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    doFetch()

    if (options?.refreshInterval) {
      const interval = setInterval(doFetch, options.refreshInterval)
      return () => {
        isMounted = false
        clearInterval(interval)
      }
    }

    return () => {
      isMounted = false
    }
  }, [fetcher])

  return { data, loading, error }
}
