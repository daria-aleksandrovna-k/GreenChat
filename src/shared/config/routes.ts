export const ROUTES = {
  login: '/login',
  home: '/',
  chat: (chatId: string) => `/chat/${encodeURIComponent(chatId)}`,
} as const
