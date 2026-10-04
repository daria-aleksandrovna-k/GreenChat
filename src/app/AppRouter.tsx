import { Flex, Spinner } from '@radix-ui/themes'
import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { selectIsAuthorized, useSessionStore } from '@/entities/session'
import { ROUTES } from '@/shared/config'

// Pages are loaded as separate chunks: the login form does not need the chat code
const LoginPage = lazy(() => import('@/pages/login').then((m) => ({ default: m.LoginPage })))
const ChatPage = lazy(() => import('@/pages/chat').then((m) => ({ default: m.ChatPage })))

function PageFallback() {
  return (
    <Flex height="100dvh" align="center" justify="center">
      <Spinner size="3" />
    </Flex>
  )
}

function RequireAuth() {
  const isAuthorized = useSessionStore(selectIsAuthorized)
  return isAuthorized ? <Outlet /> : <Navigate to={ROUTES.login} replace />
}

function GuestOnly() {
  const isAuthorized = useSessionStore(selectIsAuthorized)
  return isAuthorized ? <Navigate to={ROUTES.home} replace /> : <Outlet />
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path={ROUTES.home} element={<ChatPage />} />
          <Route path="/chat/:chatId" element={<ChatPage />} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </Suspense>
  )
}
