import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardChat } from '@/components/DashboardChat'
import { DashboardData } from '@/types'

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

describe('DashboardChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render the chat component', () => {
    render(<DashboardChat dashboardData={mockDashboardData} />)

    expect(screen.getByText('Dashboard Assistant')).toBeInTheDocument()
  })

  it('should render chat icon in header', () => {
    const { container } = render(<DashboardChat dashboardData={mockDashboardData} />)

    const icon = container.querySelector('svg path[d*="M8 10h.01M12 10h.01"]')
    expect(icon).toBeInTheDocument()
  })

  it('should show empty state when no messages', () => {
    render(<DashboardChat dashboardData={mockDashboardData} />)

    expect(screen.getByText('Ask me about your dashboard data')).toBeInTheDocument()
    expect(screen.getByText(/Try asking:/)).toBeInTheDocument()
  })

  it('should display example queries in empty state', () => {
    render(<DashboardChat dashboardData={mockDashboardData} />)

    expect(screen.getByText(/What's our sprint velocity/)).toBeInTheDocument()
    expect(screen.getByText(/Who are the top performers/)).toBeInTheDocument()
    expect(screen.getByText(/How many bugs do we have/)).toBeInTheDocument()
  })

  it('should disable input when dashboardData is null', () => {
    render(<DashboardChat dashboardData={null} />)

    const input = screen.getByPlaceholderText(/Select a project or sprint to start chatting/)
    expect(input).toBeDisabled()
  })

  it('should enable input when dashboardData is provided', () => {
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    expect(input).not.toBeDisabled()
  })

  it('should disable input when isLoading is true', () => {
    render(<DashboardChat dashboardData={mockDashboardData} isLoading={true} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    expect(input).toBeDisabled()
  })

  it('should update input value when typing', async () => {
    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test query')

    expect(input).toHaveValue('Test query')
  })

  it('should send message when send button is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Test response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'What is the total issues?')

    const sendButton = screen.getByText('Send')
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
  })

  it('should send message when Enter key is pressed', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Test response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test query{Enter}')

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  it('should not send message when Shift+Enter is pressed', async () => {
    const mockFetch = vi.fn()
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test query')
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
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'User message{Enter}')

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
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test query{Enter}')

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
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test{Enter}')

    // Check for loading animation (bouncing dots)
    await waitFor(() => {
      const loadingDots = document.querySelectorAll('.animate-bounce')
      expect(loadingDots.length).toBeGreaterThan(0)
    })
  })

  it('should display spinner icon in send button while processing', async () => {
    const mockFetch = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ answer: 'Response' }),
      }), 100))
    )
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test{Enter}')

    // Check for spinner in button
    await waitFor(() => {
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  it('should handle API error gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'API Error' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test query{Enter}')

    await waitFor(() => {
      expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument()
    })
  })

  it('should handle network error gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test query{Enter}')

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
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test message{Enter}')

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('should show clear chat button when messages exist', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Clear Chat')).toBeInTheDocument()
    })
  })

  it('should clear messages when clear chat button is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test message{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    const clearButton = screen.getByText('Clear Chat')
    fireEvent.click(clearButton)

    expect(screen.queryByText('Test message')).not.toBeInTheDocument()
  })

  it('should show error when trying to send without dashboard data', async () => {
    render(<DashboardChat dashboardData={null} />)

    const input = screen.getByPlaceholderText(/Select a project or sprint to start chatting/)
    expect(input).toBeDisabled()
  })

  it('should display timestamp for messages', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test{Enter}')

    await waitFor(() => {
      // Timestamps are formatted as time strings
      const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/)
      expect(timestamps.length).toBeGreaterThan(0)
    })
  })

  it('should not send empty messages', () => {
    const mockFetch = vi.fn()
    global.fetch = mockFetch

    render(<DashboardChat dashboardData={mockDashboardData} />)

    const sendButton = screen.getByText('Send')
    fireEvent.click(sendButton)

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should disable send button when input is empty', () => {
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const sendButton = screen.getByText('Send')
    expect(sendButton).toBeDisabled()
  })

  it('should enable send button when input has text', async () => {
    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test')

    const sendButton = screen.getByText('Send')
    expect(sendButton).not.toBeDisabled()
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
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test{Enter}')

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled()
    })
  })

  it('should render message in correct container style', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'AI response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'User message{Enter}')

    await waitFor(() => {
      const userMessage = screen.getByText('User message')
      const userContainer = userMessage.closest('.bg-blue-100')
      expect(userContainer).toBeInTheDocument()
    })
  })

  it('should render assistant message in correct container style', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'AI response' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Question{Enter}')

    await waitFor(() => {
      const aiMessage = screen.getByText('AI response')
      const aiContainer = aiMessage.closest('.bg-gray-100')
      expect(aiContainer).toBeInTheDocument()
    })
  })

  it('should have fixed height messages area', () => {
    const { container } = render(<DashboardChat dashboardData={mockDashboardData} />)

    const messagesArea = container.querySelector('.h-96')
    expect(messagesArea).toBeInTheDocument()
  })

  it('should have overflow-y-auto on messages area', () => {
    const { container } = render(<DashboardChat dashboardData={mockDashboardData} />)

    const messagesArea = container.querySelector('.overflow-y-auto')
    expect(messagesArea).toBeInTheDocument()
  })

  it('should render empty state icon', () => {
    const { container } = render(<DashboardChat dashboardData={mockDashboardData} />)

    const icon = container.querySelector('svg.w-16.h-16')
    expect(icon).toBeInTheDocument()
  })

  it('should handle API response with error field', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'API returned error' }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)
    await user.type(input, 'Test{Enter}')

    await waitFor(() => {
      expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument()
    })
  })

  it('should display multiple messages in order', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ answer: 'First response' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ answer: 'Second response' }),
      })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<DashboardChat dashboardData={mockDashboardData} />)

    const input = screen.getByPlaceholderText(/Ask about sprint metrics/)

    await user.type(input, 'First{Enter}')
    await waitFor(() => {
      expect(screen.getByText('First response')).toBeInTheDocument()
    })

    await user.type(input, 'Second{Enter}')
    await waitFor(() => {
      expect(screen.getByText('Second response')).toBeInTheDocument()
    })

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })
})
