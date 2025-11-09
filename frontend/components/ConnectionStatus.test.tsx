import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionStatus } from './ConnectionStatus'

describe('ConnectionStatus', () => {
  it('should render with connected status', () => {
    render(<ConnectionStatus status="connected" message="Connected to JIRA" />)

    expect(screen.getByText('Connected to JIRA')).toBeInTheDocument()
  })

  it('should display green dot for connected status', () => {
    const { container } = render(<ConnectionStatus status="connected" message="Connected" />)

    const statusDot = container.querySelector('.bg-green-500')
    expect(statusDot).toBeInTheDocument()
    expect(statusDot).toHaveClass('shadow-[0_0_8px_rgba(76,175,80,0.5)]')
  })

  it('should render with checking status', () => {
    render(<ConnectionStatus status="checking" message="Checking connection..." />)

    expect(screen.getByText('Checking connection...')).toBeInTheDocument()
  })

  it('should display gray dot for checking status', () => {
    const { container } = render(<ConnectionStatus status="checking" message="Checking..." />)

    const statusDot = container.querySelector('.bg-gray-400')
    expect(statusDot).toBeInTheDocument()
  })

  it('should render with error status', () => {
    render(<ConnectionStatus status="error" message="Connection failed" />)

    expect(screen.getByText('Connection failed')).toBeInTheDocument()
  })

  it('should display red dot for error status', () => {
    const { container } = render(<ConnectionStatus status="error" message="Error" />)

    const statusDot = container.querySelector('.bg-red-500')
    expect(statusDot).toBeInTheDocument()
    expect(statusDot).toHaveClass('shadow-[0_0_8px_rgba(244,67,54,0.5)]')
  })

  it('should apply correct container styling', () => {
    const { container } = render(<ConnectionStatus status="connected" message="Connected" />)

    const containerDiv = container.querySelector('.flex.items-center.gap-2')
    expect(containerDiv).toBeInTheDocument()
    expect(containerDiv).toHaveClass('bg-container')
    expect(containerDiv).toHaveClass('shadow-card')
  })

  it('should display status dot with transition', () => {
    const { container } = render(<ConnectionStatus status="connected" message="Connected" />)

    const statusDot = container.querySelector('.rounded-full')
    expect(statusDot).toHaveClass('transition-colors')
    expect(statusDot).toHaveClass('duration-300')
  })
})
