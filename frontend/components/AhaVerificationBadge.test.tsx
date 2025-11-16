import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AhaVerificationBadge from '@/components/AhaVerificationBadge'
import { AhaVerification } from '@/types'

describe('AhaVerificationBadge', () => {
  const mockVerificationExists: AhaVerification = {
    jiraKey: 'TEST-123',
    existsInAha: true,
    ahaReference: 'AHA-456',
    ahaUrl: 'https://example.aha.io/features/AHA-456',
    ahaStatus: 'In Progress',
  }

  const mockVerificationNotExists: AhaVerification = {
    jiraKey: 'TEST-456',
    existsInAha: false,
  }

  it('should not render when verification is undefined', () => {
    const { container } = render(
      <AhaVerificationBadge jiraKey="TEST-123" verification={undefined} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render green badge when ticket exists in Aha', () => {
    render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    expect(screen.getByText(/Aha: AHA-456/)).toBeInTheDocument()
  })

  it('should render as link when ticket exists in Aha', () => {
    render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', mockVerificationExists.ahaUrl)
  })

  it('should open Aha link in new tab', () => {
    render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should display checkmark icon when ticket exists in Aha', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const checkmarkIcon = container.querySelector('svg path[d*="M5 13l4 4L19 7"]')
    expect(checkmarkIcon).toBeInTheDocument()
  })

  it('should have green styling when ticket exists in Aha', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const badge = container.querySelector('.bg-green-100')
    expect(badge).toBeInTheDocument()
  })

  it('should display Aha reference number', () => {
    render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    expect(screen.getByText(/AHA-456/)).toBeInTheDocument()
  })

  it('should show tooltip with Aha reference and status', () => {
    render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('title', 'Aha Feature: AHA-456 - In Progress')
  })

  it('should render yellow warning badge when ticket does not exist in Aha', () => {
    render(
      <AhaVerificationBadge
        jiraKey="TEST-456"
        verification={mockVerificationNotExists}
      />
    )

    expect(screen.getByText('Not in Aha')).toBeInTheDocument()
  })

  it('should not render as link when ticket does not exist in Aha', () => {
    render(
      <AhaVerificationBadge
        jiraKey="TEST-456"
        verification={mockVerificationNotExists}
      />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('should display warning icon when ticket does not exist in Aha', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-456"
        verification={mockVerificationNotExists}
      />
    )

    const warningIcon = container.querySelector('svg path[d*="M12 9v2m0 4h.01"]')
    expect(warningIcon).toBeInTheDocument()
  })

  it('should have yellow styling when ticket does not exist in Aha', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-456"
        verification={mockVerificationNotExists}
      />
    )

    const badge = container.querySelector('.bg-yellow-100')
    expect(badge).toBeInTheDocument()
  })

  it('should show tooltip explaining ticket is not in Aha', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-456"
        verification={mockVerificationNotExists}
      />
    )

    const badge = container.querySelector('span[title="This ticket does not exist in Aha"]')
    expect(badge).toBeInTheDocument()
  })

  it('should stop event propagation when clicking Aha link', () => {
    render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const link = screen.getByRole('link')
    const clickEvent = new MouseEvent('click', { bubbles: true })
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation')

    fireEvent(link, clickEvent)

    expect(stopPropagationSpy).toHaveBeenCalled()
  })

  it('should have proper styling for inline display', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const badge = container.querySelector('.inline-flex')
    expect(badge).toBeInTheDocument()
  })

  it('should have rounded corners', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const badge = container.querySelector('.rounded-xl')
    expect(badge).toBeInTheDocument()
  })

  it('should have proper padding', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const badge = container.querySelector('.px-2\\.5.py-1')
    expect(badge).toBeInTheDocument()
  })

  it('should have font styling for badge text', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const badge = container.querySelector('.text-xs.font-semibold')
    expect(badge).toBeInTheDocument()
  })

  it('should support dark mode for exists badge', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const badge = container.querySelector('.dark\\:bg-green-900')
    expect(badge).toBeInTheDocument()
  })

  it('should support dark mode for not exists badge', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-456"
        verification={mockVerificationNotExists}
      />
    )

    const badge = container.querySelector('.dark\\:bg-yellow-900')
    expect(badge).toBeInTheDocument()
  })

  it('should have hover effect on exists badge', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const badge = container.querySelector('.hover\\:bg-green-200')
    expect(badge).toBeInTheDocument()
  })

  it('should display icon with proper size', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const icon = container.querySelector('svg.w-3.h-3')
    expect(icon).toBeInTheDocument()
  })

  it('should handle verification without ahaStatus', () => {
    const verificationWithoutStatus: AhaVerification = {
      jiraKey: 'TEST-123',
      existsInAha: true,
      ahaReference: 'AHA-789',
      ahaUrl: 'https://example.aha.io/features/AHA-789',
    }

    render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={verificationWithoutStatus}
      />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('title', 'Aha Feature: AHA-789 - undefined')
  })

  it('should handle verification with error field', () => {
    const verificationWithError: AhaVerification = {
      jiraKey: 'TEST-123',
      existsInAha: false,
      error: 'Failed to verify',
    }

    render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={verificationWithError}
      />
    )

    expect(screen.getByText('Not in Aha')).toBeInTheDocument()
  })

  it('should align icon and text with gap', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const badge = container.querySelector('.gap-1')
    expect(badge).toBeInTheDocument()
  })

  it('should have transition effect on hover for exists badge', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const badge = container.querySelector('.transition-colors')
    expect(badge).toBeInTheDocument()
  })

  it('should render correctly in light mode', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const badge = container.querySelector('.text-green-800')
    expect(badge).toBeInTheDocument()
  })

  it('should render correctly in dark mode text color', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-123"
        verification={mockVerificationExists}
      />
    )

    const badge = container.querySelector('.dark\\:text-green-200')
    expect(badge).toBeInTheDocument()
  })

  it('should handle null verification gracefully', () => {
    const { container } = render(
      <AhaVerificationBadge jiraKey="TEST-123" verification={null as any} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should display proper warning icon for not in Aha', () => {
    const { container } = render(
      <AhaVerificationBadge
        jiraKey="TEST-456"
        verification={mockVerificationNotExists}
      />
    )

    // Triangle warning icon path
    const warningPath = container.querySelector('svg path[d*="M12 9v2m0 4h.01m-6.938 4h13.856"]')
    expect(warningPath).toBeInTheDocument()
  })
})
