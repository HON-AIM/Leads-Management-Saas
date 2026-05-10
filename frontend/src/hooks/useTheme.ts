import { useThemeStore } from '@/stores/themeStore'

export function useTheme() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' }
}
