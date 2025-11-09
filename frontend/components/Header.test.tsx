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

// Mock Next Image
vi.mock('next/image', () => ({
  default: ({ src, alt, width, height }: any) => (
    <img src={src} alt={alt} width={width} height={height} data-testid="logo-image" />
  )
}))

describe('Header', () => {
  it('should render the header with title', () => {
    render(<Header connectionStatus="connected" connectionMessage="Connected to JIRA" />)

    expect(screen.getByText('Development Metrics Dashboard')).toBeInTheDocument()
  })

  it('should render the logo', () => {
    render(<Header connectionStatus="connected" connectionMessage="Connected to JIRA" />)

    const logo = screen.getByTestId('logo-image')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('src', '/legalsifter-logo.png')
    expect(logo).toHaveAttribute('alt', 'Legal Sifter')
  })

  it('should render ThemeToggle component', () => {
    render(<Header connectionStatus="connected" connectionMessage="Connected to JIRA" />)

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('should render ConnectionStatus component with correct props', () => {
    render(<Header connectionStatus="checking" connectionMessage="Connecting..." />)

    expect(screen.getByTestId('connection-status')).toBeInTheDocument()
    expect(screen.getByTestId('status')).toHaveTextContent('checking')
    expect(screen.getByTestId('message')).toHaveTextContent('Connecting...')
  })

  it('should render with error connection status', () => {
    render(<Header connectionStatus="error" connectionMessage="Connection failed" />)

    expect(screen.getByTestId('status')).toHaveTextContent('error')
    expect(screen.getByTestId('message')).toHaveTextContent('Connection failed')
  })

  it('should apply correct header styling', () => {
    const { container } = render(<Header connectionStatus="connected" connectionMessage="Connected" />)

    const header = container.querySelector('header')
    expect(header).toHaveClass('flex')
    expect(header).toHaveClass('justify-between')
    expect(header).toHaveClass('items-center')
  })
})
