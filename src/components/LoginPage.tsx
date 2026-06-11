import { useState } from 'react'
import { Container, Paper, Title, TextInput, PasswordInput, Button, Alert, Stack, Center, Box } from '@mantine/core'
import { IconAlertCircle, IconChartBar } from '@tabler/icons-react'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('team@company.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <Box className="app-bg" style={{ minHeight: '100vh' }}>
      <Center style={{ minHeight: '100vh' }}>
        <Container size="xs">
          <Paper shadow="md" p="xl" radius="md">
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <Center>
                  <IconChartBar size={40} stroke={1.5} />
                </Center>
                <Title order={2} ta="center">Contact Metrics</Title>
                <Title order={4} ta="center" c="dimmed" fw={400}>Sign in</Title>

                {error && (
                  <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" radius="md">
                    {error}
                  </Alert>
                )}

                <TextInput
                  label="Email"
                  placeholder="team@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  required
                />

                <PasswordInput
                  label="Password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  required
                  autoFocus
                />

                <Button type="submit" loading={loading} fullWidth radius="md">
                  Sign In
                </Button>
              </Stack>
            </form>
          </Paper>
        </Container>
      </Center>
    </Box>
  )
}
