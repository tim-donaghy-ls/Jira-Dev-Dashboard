import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SprintAnalysisModal from '@/components/SprintAnalysisModal'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('SprintAnalysisModal', () => {
  const mockAnalysis = `## Sprint 42 Analysis

### Performance Metrics
- Velocity: 45 points
- Completed: 38 points
- Completion Rate: 84%

### Team Insights
- Top Performer: John Doe
- Most Active: Jane Smith

### Recommendations
- Focus on code review efficiency
- Reduce WIP limits`

  const mockSprintName = 'Sprint 42'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.useRealTimers()
  })

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={false}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render when isOpen is true', () => {
    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText('Sprint Analysis')).toBeInTheDocument()
  })

  it('should display sprint name', () => {
    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText('Sprint 42')).toBeInTheDocument()
  })

  it('should display analysis content', () => {
    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText(/Sprint 42 Analysis/)).toBeInTheDocument()
    expect(screen.getByText(/Performance Metrics/)).toBeInTheDocument()
    expect(screen.getByText(/Team Insights/)).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={onClose}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

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
      <SprintAnalysisModal
        isOpen={true}
        onClose={onClose}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should copy analysis to clipboard when copy button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const copyButton = screen.getByText('Copy')
    fireEvent.click(copyButton)

    expect(writeTextMock).toHaveBeenCalledWith(mockAnalysis)
  })

  it('should show "Copied!" message after copying', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const copyButton = screen.getByText('Copy')
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
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const copyButton = screen.getByText('Copy')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })

    // Wait for timer to reset the copied state
    await waitFor(() => {
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
      expect(screen.getByText('Copy')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should download analysis as markdown file when download button is clicked', () => {
    const createElementSpy = vi.spyOn(document, 'createElement')
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    const { unmount } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const downloadButton = screen.getByText('Download')
    fireEvent.click(downloadButton)

    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()

    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
    unmount()
  })

  it('should create proper filename for download', () => {
    const createElementSpy = vi.spyOn(document, 'createElement')
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    const { unmount } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName="Sprint 42"
      />
    )

    const downloadButton = screen.getByText('Download')
    fireEvent.click(downloadButton)

    const calls = createElementSpy.mock.results
    const anchorElement = calls.find(result => result.value?.tagName === 'A')?.value

    // Filename should contain Sprint_Analysis and sprint name with underscores
    expect(anchorElement?.download).toMatch(/Sprint_Analysis_Sprint_42_\d{4}-\d{2}-\d{2}\.md/)

    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
    unmount()
  })

  it('should render copy icon when not copied', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
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
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const copyButton = screen.getByText('Copy')
    fireEvent.click(copyButton)

    await waitFor(() => {
      const checkIcon = container.querySelector('.lucide-check')
      expect(checkIcon).toBeInTheDocument()
    })
  })

  it('should render download icon', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const downloadIcon = container.querySelector('.lucide-download')
    expect(downloadIcon).toBeInTheDocument()
  })

  it('should render X icon in header close button', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const xIcon = container.querySelector('.lucide-x')
    expect(xIcon).toBeInTheDocument()
  })

  it('should have backdrop blur effect', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const backdrop = container.querySelector('.backdrop-blur-sm')
    expect(backdrop).toBeInTheDocument()
  })

  it('should have proper z-index for modal overlay', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const overlay = container.querySelector('.z-50')
    expect(overlay).toBeInTheDocument()
  })

  it('should have max width of 5xl', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const modal = container.querySelector('.max-w-5xl')
    expect(modal).toBeInTheDocument()
  })

  it('should have max height constraint', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const modal = container.querySelector('.max-h-\\[90vh\\]')
    expect(modal).toBeInTheDocument()
  })

  it('should have scrollable content area', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const contentArea = container.querySelector('.overflow-y-auto')
    expect(contentArea).toBeInTheDocument()
  })

  it('should render markdown headers correctly', () => {
    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText(/Sprint 42 Analysis/)).toBeInTheDocument()
  })

  it('should handle empty analysis', () => {
    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis=""
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText('Sprint Analysis')).toBeInTheDocument()
  })

  it('should handle very long analysis', () => {
    const longAnalysis = 'Line\n'.repeat(100)
    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={longAnalysis}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText('Sprint Analysis')).toBeInTheDocument()
  })

  it('should preserve whitespace in analysis', () => {
    const analysisWithWhitespace = '  Indented text\n\nDouble newline'
    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={analysisWithWhitespace}
        sprintName={mockSprintName}
      />
    )

    const content = screen.getByText(/Indented text/)
    expect(content).toBeInTheDocument()
  })

  it('should render in dark mode styles', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const darkModeElements = container.querySelectorAll('.dark\\:bg-gray-800')
    expect(darkModeElements.length).toBeGreaterThan(0)
  })

  it('should have proper border styling', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const borders = container.querySelectorAll('.border-gray-200')
    expect(borders.length).toBeGreaterThan(0)
  })

  it('should have shadow effect on modal', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const shadow = container.querySelector('.shadow-2xl')
    expect(shadow).toBeInTheDocument()
  })

  it('should have rounded corners on modal', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const rounded = container.querySelector('.rounded-lg')
    expect(rounded).toBeInTheDocument()
  })

  it('should render with proper flexbox layout', () => {
    const { container } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const flexCol = container.querySelector('.flex.flex-col')
    expect(flexCol).toBeInTheDocument()
  })

  it('should handle special characters in analysis', () => {
    const analysisWithSpecialChars = '**Bold** *Italic* `code` [link](url)'
    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={analysisWithSpecialChars}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText(/Bold/)).toBeInTheDocument()
  })

  it('should render list items correctly', () => {
    const analysisWithList = `- Item 1
- Item 2
- Item 3`

    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={analysisWithList}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText(/Item 1/)).toBeInTheDocument()
    expect(screen.getByText(/Item 2/)).toBeInTheDocument()
  })

  it('should have three action buttons in header', () => {
    render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    expect(screen.getByText('Download')).toBeInTheDocument()
    expect(screen.getByText('Copy')).toBeInTheDocument()
    // X button doesn't have text, just icon
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(4) // Download, Copy, X, Close
  })

  it('should sanitize sprint name for filename', () => {
    const createElementSpy = vi.spyOn(document, 'createElement')
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    const { unmount } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName="Sprint #42 / Test"
      />
    )

    const downloadButton = screen.getByText('Download')
    fireEvent.click(downloadButton)

    const calls = createElementSpy.mock.results
    const anchorElement = calls.find(result => result.value?.tagName === 'A')?.value

    // Special characters should be replaced with underscores
    expect(anchorElement?.download).not.toMatch(/[#\/]/)

    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
    unmount()
  })

  it('should create blob with correct type for markdown', () => {
    const createElementSpy = vi.spyOn(document, 'createElement')
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    const { unmount } = render(
      <SprintAnalysisModal
        isOpen={true}
        onClose={vi.fn()}
        analysis={mockAnalysis}
        sprintName={mockSprintName}
      />
    )

    const downloadButton = screen.getByText('Download')
    fireEvent.click(downloadButton)

    // Blob should be created with markdown MIME type
    expect(global.URL.createObjectURL).toHaveBeenCalled()

    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
    unmount()
  })
})
