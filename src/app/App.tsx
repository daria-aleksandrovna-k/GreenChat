// Radix Themes in parts: tokens of the used palettes only instead of all 30 (see styles.css)
import '@radix-ui/themes/tokens/base.css'
import '@radix-ui/themes/tokens/colors/blue.css'
import '@radix-ui/themes/tokens/colors/slate.css'
import '@radix-ui/themes/tokens/colors/red.css'
import '@radix-ui/themes/tokens/colors/amber.css'
import '@radix-ui/themes/components.css'
import '@radix-ui/themes/utilities.css'
import './styles/global.css'
import { Theme } from '@radix-ui/themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './AppRouter'

// BASE_URL matches base in vite.config.ts: '/' locally, '/GreenChat/' on GitHub Pages
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

export function App() {
  return (
    <Theme appearance="light" accentColor="blue" grayColor="slate" radius="large">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={basename}>
          <AppRouter />
        </BrowserRouter>
      </QueryClientProvider>
    </Theme>
  )
}
