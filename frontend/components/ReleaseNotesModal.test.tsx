import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReleaseNotesModal from '@/components/ReleaseNotesModal'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

describe('ReleaseNotesModal', () => {
  const mockReleaseNotes = `# Sprint 42 Release Notes

## New Features
- Added dashboard analytics
- Implemented user authentication

## Bug Fixes
- Fixed login issue
- Resolved data loading error

## Improvements
- Enhanced performance
- Updated UI design`

  const mockSprintName = 'Sprint 42'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <ReleaseNotesModal
        isOpen={false}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render when isOpen is true', () => {
    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText('Release Notes')).toBeInTheDocument()
  })

  it('should display sprint name', () => {
    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText('Sprint 42')).toBeInTheDocument()
  })

  it('should display release notes content', () => {
    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText(/Sprint 42 Release Notes/)).toBeInTheDocument()
    expect(screen.getByText(/New Features/)).toBeInTheDocument()
    expect(screen.getByText(/Bug Fixes/)).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={onClose}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    // Find close button with X icon
    const closeButtons = screen.getAllByRole('button')
    const xButton = closeButtons.find(btn => {
      const svg = btn.querySelector('svg')
      return svg && svg.classList.contains('lucide-x')
    })

    expect(xButton).toBeInTheDocument()
    if (xButton) {
      fireEvent.click(xButton)
      expect(onClose).toHaveBeenCalledTimes(1)
    }
  })

  it('should call onClose when close button in footer is clicked', () => {
    const onClose = vi.fn()
    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={onClose}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should copy release notes to clipboard when copy button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const copyButton = screen.getByText('Copy to Clipboard')
    fireEvent.click(copyButton)

    expect(writeTextMock).toHaveBeenCalledWith(mockReleaseNotes)
  })

  it('should show "Copied!" message after copying', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const copyButton = screen.getByText('Copy to Clipboard')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })
  })

  it('should reset "Copied!" message after 2 seconds', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const copyButton = screen.getByText('Copy to Clipboard')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })

    // Wait for timer to reset the copied state
    await waitFor(() => {
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
      expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should render copy icon when not copied', () => {
    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const copyIcon = container.querySelector('.lucide-copy')
    expect(copyIcon).toBeInTheDocument()
  })

  it('should render check icon when copied', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const copyButton = screen.getByText('Copy to Clipboard')
    fireEvent.click(copyButton)

    await waitFor(() => {
      const checkIcon = container.querySelector('.lucide-check')
      expect(checkIcon).toBeInTheDocument()
    })
  })

  it('should render X icon in header close button', () => {
    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const xIcon = container.querySelector('.lucide-x')
    expect(xIcon).toBeInTheDocument()
  })

  it('should have backdrop blur effect', () => {
    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const backdrop = container.querySelector('.backdrop-blur-sm')
    expect(backdrop).toBeInTheDocument()
  })

  it('should have proper z-index for modal overlay', () => {
    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const overlay = container.querySelector('.z-50')
    expect(overlay).toBeInTheDocument()
  })

  it('should have max height constraint', () => {
    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const modal = container.querySelector('.max-h-\\[90vh\\]')
    expect(modal).toBeInTheDocument()
  })

  it('should have scrollable content area', () => {
    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const contentArea = container.querySelector('.overflow-y-auto')
    expect(contentArea).toBeInTheDocument()
  })

  it('should render markdown headers correctly', () => {
    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    // Check that markdown is being processed (headings should be styled)
    const content = screen.getByText(/Sprint 42 Release Notes/)
    expect(content).toBeInTheDocument()
  })

  it('should handle empty release notes', () => {
    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes=""
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText('Release Notes')).toBeInTheDocument()
  })

  it('should handle very long release notes', () => {
    const longNotes = 'Line\n'.repeat(100)
    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={longNotes}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText('Release Notes')).toBeInTheDocument()
  })

  it('should preserve whitespace in release notes', () => {
    const notesWithWhitespace = '  Indented text\n\nDouble newline'
    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={notesWithWhitespace}
        sprintName={mockSprintName}
      />
    )

    const content = screen.getByText(/Indented text/)
    expect(content).toBeInTheDocument()
  })

  it('should render in dark mode styles', () => {
    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const darkModeElements = container.querySelectorAll('.dark\\:bg-gray-800')
    expect(darkModeElements.length).toBeGreaterThan(0)
  })

  it('should have proper border styling', () => {
    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const borders = container.querySelectorAll('.border-gray-200')
    expect(borders.length).toBeGreaterThan(0)
  })

  it('should have shadow effect on modal', () => {
    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const shadow = container.querySelector('.shadow-2xl')
    expect(shadow).toBeInTheDocument()
  })

  it('should have rounded corners on modal', () => {
    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const rounded = container.querySelector('.rounded-lg')
    expect(rounded).toBeInTheDocument()
  })

  it('should render with proper flexbox layout', () => {
    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const flexCol = container.querySelector('.flex.flex-col')
    expect(flexCol).toBeInTheDocument()
  })

  it('should handle special characters in release notes', () => {
    const notesWithSpecialChars = '**Bold** *Italic* `code` [link](url)'
    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={notesWithSpecialChars}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText(/Bold/)).toBeInTheDocument()
  })

  it('should render list items correctly', () => {
    const notesWithList = `- Item 1
- Item 2
- Item 3`

    render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={vi.fn()}
        releaseNotes={notesWithList}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText(/Item 1/)).toBeInTheDocument()
    expect(screen.getByText(/Item 2/)).toBeInTheDocument()
  })

  it('should not propagate click events from content area', () => {
    const onClose = vi.fn()
    const { container } = render(
      <ReleaseNotesModal
        isOpen={true}
        onClose={onClose}
        releaseNotes={mockReleaseNotes}
        sprintName={mockSprintName}
      />
    )

    const contentArea = container.querySelector('.overflow-y-auto')
    if (contentArea) {
      fireEvent.click(contentArea)
      expect(onClose).not.toHaveBeenCalled()
    }
  })
})
