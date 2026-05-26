import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider, createTheme, type CSSVariablesResolver } from '@mantine/core'
import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css'
import App from './App'

const theme = createTheme({
  defaultRadius: 'xl',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", "Segoe UI", sans-serif',
  fontFamilyMonospace:
    'SFMono-Regular, "SF Mono", "Menlo", "Monaco", monospace',
  headings: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
    fontWeight: '600',
  },
})

const resolver: CSSVariablesResolver = () => ({
  dark: {
    '--mantine-color-dimmed': '#A0A0A0',
  },
  light: {
    '--mantine-color-dimmed': '#6B7280',
  },
  variables: {},
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark" cssVariablesResolver={resolver}>
      <App />
    </MantineProvider>
  </React.StrictMode>
)
