import { PaperPlaneIcon } from '@radix-ui/react-icons'
import { Card, Flex, Heading, Text } from '@radix-ui/themes'
import { LoginForm } from '@/features/auth-login'
import styles from './LoginPage.module.css'

export function LoginPage() {
  return (
    <main className={styles.page}>
      <Card size="4" className={styles.card}>
        <Flex direction="column" align="center" gap="2" mb="5">
          <div className={styles.logo} aria-hidden>
            <PaperPlaneIcon width={40} height={40} />
          </div>
          <Heading as="h1" size="7">
            GreenChat
          </Heading>
          <Text color="gray" size="2" align="center">
            Введите параметры инстанса из консоли GREEN-API
          </Text>
        </Flex>
        <LoginForm />
      </Card>
    </main>
  )
}
