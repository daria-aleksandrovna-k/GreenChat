import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useChatStore } from '@/entities/chat'
import { useMessageStore } from '@/entities/message'
import { useSessionStore } from '@/entities/session'

export function useLogout(): () => void {
  const queryClient = useQueryClient()
  return useCallback(() => {
    useSessionStore.getState().logout()
    useChatStore.getState().reset()
    useMessageStore.getState().reset()
    queryClient.clear()
  }, [queryClient])
}
