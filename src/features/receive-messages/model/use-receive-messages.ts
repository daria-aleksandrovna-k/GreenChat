import { useQuery } from '@tanstack/react-query'
import { useSessionStore } from '@/entities/session'
import { isAuthError } from '@/shared/api'
import { POLL_ERROR_DELAY_MS } from '@/shared/config'
import { useTabLock } from '@/shared/lib'
import { pollOnce } from './poll-once'

interface PollState {
  fetchStatus: string
  status: string
  error: unknown
}

/**
 * refetchInterval is recomputed on every query state change:
 * no timer while a request is in flight, the next long-poll right after success,
 * a pause after an error, and a stop on an auth error.
 */
export function getNextPollDelay(state: PollState): number | false {
  if (state.fetchStatus !== 'idle') return false
  if (state.status !== 'error') return 1
  return isAuthError(state.error) ? false : POLL_ERROR_DELAY_MS
}

export function useReceiveMessages(): { error: Error | null } {
  const credentials = useSessionStore((state) => state.credentials)
  // One tab per instance polls: the others get messages through store sync.
  // Otherwise tabs would share the notification queue and multiply API requests
  const isPollingTab = useTabLock(credentials ? `greenchat-poll-${credentials.idInstance}` : null)

  const { error } = useQuery({
    queryKey: ['notifications', credentials?.idInstance],
    queryFn: ({ signal }) => pollOnce(credentials!, signal),
    enabled: credentials !== null && isPollingTab,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: true,
    refetchInterval: (query) => getNextPollDelay(query.state),
  })

  return { error }
}
