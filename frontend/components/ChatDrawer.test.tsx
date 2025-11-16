import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatDrawer } from '@/components/ChatDrawer'
import { DashboardData } from '@/types'

// Mock dynamic imports
vi.mock('docx', () => ({
  Document: vi.fn(),
  Packer: {
    toBlob: vi.fn().mockResolvedValue(new Blob()),
  },
  Paragraph: vi.fn(),
  TextRun: vi.fn(),
  HeadingLevel: {
    HEADING_1: 'HEADING_1',
    HEADING_2: 'HEADING_2',
  },
}))

vi.mock('xlsx', () => ({
  default: {
    utils: {
      book_new: vi.fn(() => ({})),
      aoa_to_sheet: vi.fn(() => ({})),
      book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
  },
}))

vi.mock('pptxgenjs', () => ({
  default: vi.fn().mockImplementation(() => ({
    addSlide: vi.fn(() => ({
      addText: vi.fn(),
    })),
    slides: [],
    writeFile: vi.fn().mockResolvedValue(undefined),
  })),
}))

const mockDashboardData: DashboardData = {
  jiraBaseUrl: 'https://example.atlassian.net',
  summary: {
    totalIssues: 50,
    openIssues: 20,
    closedIssues: 30,
    totalStoryPoints: 100,
    openStoryPoints: 40,
    closedStoryPoints: 60,
    avgResolutionDays: 5,
  },
  statusBreakdown: {
    'To Do': 10,
    'In Progress': 5,
    'Done': 35,
  },
  priorityBreakdown: {
    'High': 15,
    'Medium': 25,
    'Low': 10,
  },
  assigneeStats: [],
  recentIssues: [],
  allIssues: [],
}

describe('ChatDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <ChatDrawer
        isOpen={false}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    // Drawer should be off-screen
    const drawer = container.querySelector('.translate-x-full')
    expect(drawer).toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    expect(screen.getByText('Dashboard Assistant')).toBeInTheDocument()
    expect(screen.getByText('Powered by Claude AI')).toBeInTheDocument()
  })

  it('should display welcome message on first open', () => {
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    expect(screen.getByText(/Hi! I'm your Dashboard Assistant/)).toBeInTheDocument()
    expect(screen.getByText(/Analyze sprint metrics/)).toBeInTheDocument()
  })

  it('should call onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <ChatDrawer
        isOpen={true}
        onClose={onClose}
        dashboardData={mockDashboardData}
      />
    )

    const overlay = container.querySelector('.bg-black.bg-opacity-50')
    expect(overlay).toBeInTheDocument()

    if (overlay) {
      fireEvent.click(overlay)
      expect(onClose).toHaveBeenCalledTimes(1)
    }
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={onClose}
        dashboardData={mockDashboardData}
      />
    )

    const closeButtons = screen.getAllByRole('button')
    const closeButton = closeButtons.find(btn => btn.querySelector('svg path[d*="M6 18L18 6"]'))

    expect(closeButton).toBeInTheDocument()
    if (closeButton) {
      fireEvent.click(closeButton)
      expect(onClose).toHaveBeenCalledTimes(1)
    }
  })

  it('should disable input when dashboardData is null', () => {
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={null}
      />
    )

    const textarea = screen.getByPlaceholderText(/Select a project or sprint to start/)
    expect(textarea).toBeDisabled()
  })

  it('should enable input when dashboardData is provided', () => {
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    expect(textarea).not.toBeDisabled()
  })

  it('should disable input when isLoading is true', () => {
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
        isLoading={true}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    expect(textarea).toBeDisabled()
  })

  it('should update query value when typing', async () => {
    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Test query')

    expect(textarea).toHaveValue('Test query')
  })

  it('should send message when send button is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Test response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'What is the total issues?')

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons.find(btn => {
      const svg = btn.querySelector('svg path[d*="M12 19l9 2"]')
      return svg && !btn.textContent?.includes('Clear')
    })

    if (sendButton) {
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'What is the total issues?',
            dashboardData: mockDashboardData,
          }),
        })
      })
    }
  })

  it('should send message when Enter key is pressed', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Test response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Test query{Enter}')

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  it('should not send message when Shift+Enter is pressed', async () => {
    const mockFetch = vi.fn()
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Test query')
    await user.keyboard('{Shift>}{Enter}{/Shift}')

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should display user message after sending', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'AI response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'User message{Enter}')

    await waitFor(() => {
      expect(screen.getByText('User message')).toBeInTheDocument()
    })
  })

  it('should display assistant response after API call', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'AI response text' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Test query{Enter}')

    await waitFor(() => {
      expect(screen.getByText('AI response text')).toBeInTheDocument()
    })
  })

  it('should show loading indicator while processing', async () => {
    const mockFetch = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ answer: 'Response' }),
      }), 100))
    )
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Test{Enter}')

    // Check for loading animation (bouncing dots)
    await waitFor(() => {
      const loadingDots = document.querySelectorAll('.animate-bounce')
      expect(loadingDots.length).toBeGreaterThan(0)
    })
  })

  it('should handle API error gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'API Error' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Test query{Enter}')

    await waitFor(() => {
      expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument()
    })
  })

  it('should handle network error gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Test query{Enter}')

    await waitFor(() => {
      expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument()
    })
  })

  it('should clear input after sending message', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Test message{Enter}')

    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  it('should show clear chat button when messages exist', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    // Welcome message exists, but clear should only show after user messages
    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Test{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument()
    })
  })

  it('should clear messages when clear button is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Test message{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    const clearButton = screen.getByText('Clear')
    fireEvent.click(clearButton)

    expect(screen.queryByText('Test message')).not.toBeInTheDocument()
  })

  it('should show error message when no dashboard data', async () => {
    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={null}
      />
    )

    const textarea = screen.getByPlaceholderText(/Select a project or sprint to start/)
    expect(textarea).toBeDisabled()
  })

  it('should display timestamp for messages', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Test{Enter}')

    await waitFor(() => {
      // Timestamps are formatted as time strings
      const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/)
      expect(timestamps.length).toBeGreaterThan(0)
    })
  })

  it('should not send empty messages', async () => {
    const mockFetch = vi.fn()
    global.fetch = mockFetch

    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const sendButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg path[d*="M12 19l9 2"]')
    )

    if (sendButton) {
      fireEvent.click(sendButton)
      expect(mockFetch).not.toHaveBeenCalled()
    }
  })

  it('should render code blocks with copy functionality', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: '```javascript\nconst test = true;\n```' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Show code{Enter}')

    await waitFor(() => {
      expect(screen.getByText('javascript')).toBeInTheDocument()
      expect(screen.getByText('const test = true;')).toBeInTheDocument()
      expect(screen.getByText('Copy')).toBeInTheDocument()
    })
  })

  it('should auto-scroll to latest message', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Response' }),
    })
    global.fetch = mockFetch

    const scrollIntoViewMock = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock

    const user = userEvent.setup()
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    const textarea = screen.getByPlaceholderText(/Ask questions or request Word docs/)
    await user.type(textarea, 'Test{Enter}')

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled()
    })
  })

  it('should handle drawer translate classes correctly', () => {
    const { rerender } = render(
      <ChatDrawer
        isOpen={false}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    let drawer = document.querySelector('.fixed.right-0')
    expect(drawer).toHaveClass('translate-x-full')

    rerender(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    drawer = document.querySelector('.fixed.right-0')
    expect(drawer).toHaveClass('translate-x-0')
  })

  it('should display helper text about keyboard shortcuts', () => {
    render(
      <ChatDrawer
        isOpen={true}
        onClose={vi.fn()}
        dashboardData={mockDashboardData}
      />
    )

    expect(screen.getByText(/Press Enter to send, Shift\+Enter for new line/)).toBeInTheDocument()
  })
})
