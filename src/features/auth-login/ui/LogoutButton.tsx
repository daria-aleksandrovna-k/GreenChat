import { ExitIcon } from '@radix-ui/react-icons'
import { IconButton } from '@radix-ui/themes'
import { useLogout } from '../model/use-logout'

export function LogoutButton() {
  const logout = useLogout()
  return (
    <IconButton
      variant="ghost"
      color="gray"
      size="3"
      aria-label="Выйти"
      title="Выйти"
      onClick={logout}
    >
      <ExitIcon width={20} height={20} />
    </IconButton>
  )
}
