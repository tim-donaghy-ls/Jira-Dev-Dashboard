'use client'

import { useTheme } from '@/context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="bg-container shadow-card border border-custom rounded-lg px-3 py-2 cursor-pointer text-xl transition-all duration-300 hover:shadow-card-hover hover:-translate-y-px"
      title="Toggle light/dark mode"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className="theme-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
    </button>
  )
}
