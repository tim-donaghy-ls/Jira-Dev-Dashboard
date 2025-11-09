import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'

// Mock the ThemeContext
const mockToggleTheme = vi.fn()
vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: mockToggleTheme
  })
}))

describe('ThemeToggle', () => {
  it('should render theme toggle button', () => {
    render(<ThemeToggle />)

    const button = screen.getByTitle('Toggle light/dark mode')
    expect(button).toBeInTheDocument()
  })

  it('should display moon icon in light mode', () => {
    render(<ThemeToggle />)

    expect(screen.getByText('🌙')).toBeInTheDocument()
  })

  it('should call toggleTheme when clicked', () => {
    render(<ThemeToggle />)

    const button = screen.getByTitle('Toggle light/dark mode')
    fireEvent.click(button)

    expect(mockToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('should have correct aria-label', () => {
    render(<ThemeToggle />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode')
  })

  it('should apply hover styles', () => {
    const { container } = render(<ThemeToggle />)

    const button = container.querySelector('button')
    expect(button).toHaveClass('hover:shadow-card-hover')
    expect(button).toHaveClass('hover:-translate-y-px')
  })
})
