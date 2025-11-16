import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChartModal } from '@/components/ChartModal'

describe('ChartModal', () => {
  const mockOnClose = vi.fn()
  const mockTitle = 'Test Chart Title'
  const mockChildren = <div data-testid="chart-content">Chart Content</div>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <ChartModal isOpen={false} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render when isOpen is true', () => {
    render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    expect(screen.getByText(mockTitle)).toBeInTheDocument()
  })

  it('should display modal title', () => {
    render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    expect(screen.getByText('Test Chart Title')).toBeInTheDocument()
  })

  it('should render children content', () => {
    render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    expect(screen.getByTestId('chart-content')).toBeInTheDocument()
    expect(screen.getByText('Chart Content')).toBeInTheDocument()
  })

  it('should call onClose when overlay is clicked', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const overlay = container.querySelector('.backdrop-blur-sm')
    expect(overlay).toBeInTheDocument()

    if (overlay) {
      fireEvent.click(overlay)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    }
  })

  it('should call onClose when close button is clicked', () => {
    render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const closeButton = screen.getByText('×')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should not call onClose when clicking modal content', () => {
    render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const content = screen.getByTestId('chart-content')
    fireEvent.click(content)

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('should not propagate click events from content area', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const modalContent = container.querySelector('.bg-container.border.border-custom')
    expect(modalContent).toBeInTheDocument()

    if (modalContent) {
      fireEvent.click(modalContent)
      expect(mockOnClose).not.toHaveBeenCalled()
    }
  })

  it('should have backdrop blur effect', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const backdrop = container.querySelector('.backdrop-blur-sm')
    expect(backdrop).toBeInTheDocument()
  })

  it('should have proper z-index', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const overlay = container.querySelector('.z-50')
    expect(overlay).toBeInTheDocument()
  })

  it('should have max width of 6xl', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const modal = container.querySelector('.max-w-6xl')
    expect(modal).toBeInTheDocument()
  })

  it('should have max height of 90vh', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const modal = container.querySelector('.max-h-\\[90vh\\]')
    expect(modal).toBeInTheDocument()
  })

  it('should have overflow auto on modal', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const modal = container.querySelector('.overflow-auto')
    expect(modal).toBeInTheDocument()
  })

  it('should have sticky header', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const header = screen.getByText(mockTitle).closest('.sticky')
    expect(header).toBeInTheDocument()
  })

  it('should position header at top', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const header = screen.getByText(mockTitle).closest('.top-0')
    expect(header).toBeInTheDocument()
  })

  it('should have border on header', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const header = screen.getByText(mockTitle).closest('.border-b')
    expect(header).toBeInTheDocument()
  })

  it('should have rounded corners on modal', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const modal = container.querySelector('.rounded-lg')
    expect(modal).toBeInTheDocument()
  })

  it('should have shadow effect', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const modal = container.querySelector('.shadow-2xl')
    expect(modal).toBeInTheDocument()
  })

  it('should center modal on screen', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const overlay = container.querySelector('.flex.items-center.justify-center')
    expect(overlay).toBeInTheDocument()
  })

  it('should have full screen overlay', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const overlay = container.querySelector('.fixed.inset-0')
    expect(overlay).toBeInTheDocument()
  })

  it('should display close button with × symbol', () => {
    render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const closeButton = screen.getByText('×')
    expect(closeButton).toBeInTheDocument()
  })

  it('should have proper padding on header', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const header = container.querySelector('.px-6.py-4')
    expect(header).toBeInTheDocument()
  })

  it('should have proper padding on content', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const content = screen.getByTestId('chart-content').closest('.p-6')
    expect(content).toBeInTheDocument()
  })

  it('should have fixed height for chart container', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const chartContainer = screen.getByTestId('chart-content').closest('.h-\\[600px\\]')
    expect(chartContainer).toBeInTheDocument()
  })

  it('should have full width for chart container', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const chartContainer = screen.getByTestId('chart-content').closest('.w-full')
    expect(chartContainer).toBeInTheDocument()
  })

  it('should apply dark overlay background', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const overlay = container.querySelector('.bg-black\\/50')
    expect(overlay).toBeInTheDocument()
  })

  it('should have hover effect on close button', () => {
    render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const closeButton = screen.getByText('×').closest('button')
    expect(closeButton).toHaveClass('hover:bg-black/5')
  })

  it('should support dark mode styling', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const darkModeElements = container.querySelectorAll('.dark\\:hover\\:bg-white\\/10')
    expect(darkModeElements.length).toBeGreaterThan(0)
  })

  it('should render with custom title', () => {
    const customTitle = 'Custom Chart Modal Title'
    render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={customTitle}>
        {mockChildren}
      </ChartModal>
    )

    expect(screen.getByText(customTitle)).toBeInTheDocument()
  })

  it('should render multiple children', () => {
    render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </ChartModal>
    )

    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
  })

  it('should have proper spacing between title and close button', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const headerFlex = container.querySelector('.flex.justify-between.items-center')
    expect(headerFlex).toBeInTheDocument()
  })

  it('should have large text for title', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const title = container.querySelector('.text-xl.font-bold')
    expect(title).toBeInTheDocument()
  })

  it('should have proper button sizing', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const closeButton = container.querySelector('.w-8.h-8')
    expect(closeButton).toBeInTheDocument()
  })

  it('should have transition effect on close button', () => {
    render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const closeButton = screen.getByText('×').closest('button')
    expect(closeButton).toHaveClass('transition-colors')
  })

  it('should handle empty title', () => {
    render(
      <ChartModal isOpen={true} onClose={mockOnClose} title="">
        {mockChildren}
      </ChartModal>
    )

    // Modal should still render
    expect(screen.getByTestId('chart-content')).toBeInTheDocument()
  })

  it('should handle null children gracefully', () => {
    render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {null}
      </ChartModal>
    )

    expect(screen.getByText(mockTitle)).toBeInTheDocument()
  })

  it('should maintain modal dimensions', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const modal = container.querySelector('.w-full.max-w-6xl')
    expect(modal).toBeInTheDocument()
  })

  it('should have proper padding around modal content', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const overlay = container.querySelector('.p-4')
    expect(overlay).toBeInTheDocument()
  })

  it('should align close button properly', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const closeButton = container.querySelector('.flex.items-center.justify-center')
    expect(closeButton).toBeInTheDocument()
  })

  it('should stop propagation when clicking modal', () => {
    const onClose = vi.fn()
    const { container } = render(
      <ChartModal isOpen={true} onClose={onClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const modal = container.querySelector('.bg-container')
    if (modal) {
      const event = new MouseEvent('click', { bubbles: true })
      fireEvent(modal, event)

      // Click on modal content should not close modal
      expect(onClose).not.toHaveBeenCalled()
    }
  })

  it('should have bold font for close button', () => {
    const { container } = render(
      <ChartModal isOpen={true} onClose={mockOnClose} title={mockTitle}>
        {mockChildren}
      </ChartModal>
    )

    const closeButton = container.querySelector('.text-2xl.font-bold')
    expect(closeButton).toBeInTheDocument()
  })
})
