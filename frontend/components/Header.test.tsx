import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from './Header'

// Mock the child components
vi.mock('./ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>
}))

vi.mock('./ConnectionStatus', () => ({
  ConnectionStatus: ({ status, message }: { status: string; message: string }) => (
    <div data-testid="connection-status">
      <span data-testid="status">{status}</span>
      <span data-testid="message">{message}</span>
    </div>
  )
}))

vi.mock('./UserMenu', () => ({
  default: () => <div data-testid="user-menu">User Menu</div>
}))

// Mock Next Image
vi.mock('next/image', () => ({
  default: ({ src, alt, width, height }: any) => (
    <img src={src} alt={alt} width={width} height={height} data-testid="logo-image" />
  )
}))

describe('Header', () => {
  it('should render the header with title', () => {
    render(<Header />)

    expect(screen.getByText('Development Metrics Dashboard')).toBeInTheDocument()
  })

  it('should render the logo', () => {
    render(<Header />)

    const logos = screen.getAllByTestId('logo-image')
    expect(logos).toHaveLength(2) // One for light mode, one for dark mode
    expect(logos[0]).toHaveAttribute('src', '/legalsifter-logo.png')
    expect(logos[0]).toHaveAttribute('alt', 'Legal Sifter')
    expect(logos[1]).toHaveAttribute('src', '/legalsifter-logo-wh-dark.png')
    expect(logos[1]).toHaveAttribute('alt', 'Legal Sifter')
  })

  it('should render ThemeToggle component', () => {
    render(<Header />)

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('should apply correct header styling', () => {
    const { container } = render(<Header />)

    const header = container.querySelector('header')
    expect(header).toHaveClass('mb-8')

    // Check top bar exists with correct styling (first direct child div)
    const topBar = header?.children[0]
    expect(topBar).toHaveClass('flex')
    expect(topBar).toHaveClass('justify-end')
    expect(topBar).toHaveClass('items-center')

    // Check main header row exists (second direct child div)
    const mainHeader = header?.children[1]
    expect(mainHeader).toHaveClass('flex')
    expect(mainHeader).toHaveClass('items-center')
  })
})
