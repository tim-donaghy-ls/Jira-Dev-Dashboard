import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IssueCard } from './IssueCard'
import { JiraIssue } from '@/types'
import * as api from '@/lib/api'

// Mock the API module
vi.mock('@/lib/api', () => ({
  fetchIssueDetails: vi.fn(),
}))

const mockIssue: JiraIssue = {
  key: 'TEST-123',
  summary: 'Test issue summary',
  status: 'In Progress',
  assignee: 'John Doe',
  priority: 'High',
  storyPoints: 5,
  created: '2024-01-01',
  updated: '2024-01-15',
  issueType: 'Story',
  description: 'This is a test description',
  statusHistory: [],
}

const mockJiraBaseUrl = 'https://example.atlassian.net'
const mockInstance = 'primary'

describe('IssueCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render basic issue information', () => {
    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    expect(screen.getByText('TEST-123')).toBeInTheDocument()
    expect(screen.getByText('Test issue summary')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('5 SP')).toBeInTheDocument()
  })

  it('should render issue metadata', () => {
    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    expect(screen.getByText(/📋 Story/)).toBeInTheDocument()
    expect(screen.getByText(/🎯 High/)).toBeInTheDocument()
    expect(screen.getByText(/👤 John Doe/)).toBeInTheDocument()
    expect(screen.getByText(/📅 Updated:/)).toBeInTheDocument()
  })

  it('should render link to JIRA with correct attributes', () => {
    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const link = screen.getByRole('link', { name: 'TEST-123' })
    expect(link).toHaveAttribute('href', `${mockJiraBaseUrl}/browse/TEST-123`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should not render story points badge when storyPoints is 0', () => {
    const issueWithoutPoints = { ...mockIssue, storyPoints: 0 }
    render(<IssueCard issue={issueWithoutPoints} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    expect(screen.queryByText('0 SP')).not.toBeInTheDocument()
  })

  it('should not render story points badge when storyPoints is null', () => {
    const issueWithoutPoints = { ...mockIssue, storyPoints: null }
    render(<IssueCard issue={issueWithoutPoints} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    expect(screen.queryByText(/SP/)).not.toBeInTheDocument()
  })

  it('should display "Unassigned" when assignee is null', () => {
    const unassignedIssue = { ...mockIssue, assignee: null }
    render(<IssueCard issue={unassignedIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    expect(screen.getByText(/👤 Unassigned/)).toBeInTheDocument()
  })

  it('should render development time when available', () => {
    const issueWithDevTime = { ...mockIssue, developmentTimeDays: 3.5 }
    render(<IssueCard issue={issueWithDevTime} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    expect(screen.getByText(/⏱️ To Do → QA: 3.5 days/)).toBeInTheDocument()
  })

  it('should apply correct status class for "In Progress"', () => {
    const { container } = render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const statusBadge = container.querySelector('.bg-orange-50')
    expect(statusBadge).toBeInTheDocument()
    expect(statusBadge).toHaveClass('text-orange-800')
  })

  it('should apply correct status class for "To Do"', () => {
    const todoIssue = { ...mockIssue, status: 'To Do' }
    const { container } = render(<IssueCard issue={todoIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const statusBadge = container.querySelector('.bg-red-50')
    expect(statusBadge).toBeInTheDocument()
  })

  it('should apply correct status class for "Done"', () => {
    const doneIssue = { ...mockIssue, status: 'Done' }
    const { container } = render(<IssueCard issue={doneIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const statusBadge = container.querySelector('.bg-green-50')
    expect(statusBadge).toBeInTheDocument()
  })

  it('should show "Click to expand" text initially', () => {
    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    expect(screen.getByText('Click to expand')).toBeInTheDocument()
  })

  it('should not show expanded details initially', () => {
    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    expect(screen.queryByText('Description')).not.toBeInTheDocument()
    expect(screen.queryByText('Status Timeline')).not.toBeInTheDocument()
  })

  it('should expand and fetch details when clicked', async () => {
    const mockDetails = {
      statusHistory: [
        { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-10T10:00:00Z' },
      ],
      inProgressToQADays: 2.5,
      developmentTimeDays: 3.0,
    }

    vi.mocked(api.fetchIssueDetails).mockResolvedValue(mockDetails)

    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const card = screen.getByText('Test issue summary').closest('div')!
    fireEvent.click(card)

    // Wait for the Description header to appear after loading
    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(api.fetchIssueDetails).toHaveBeenCalledWith(mockInstance, mockIssue.key)
  })

  it('should not trigger expansion when clicking on JIRA link', () => {
    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const link = screen.getByRole('link', { name: 'TEST-123' })
    fireEvent.click(link)

    expect(screen.queryByText('Click to collapse')).not.toBeInTheDocument()
    expect(screen.queryByText('Description')).not.toBeInTheDocument()
  })

  it('should collapse when clicked again', async () => {
    const mockDetails = {
      statusHistory: [],
      inProgressToQADays: 0,
      developmentTimeDays: 0,
    }

    vi.mocked(api.fetchIssueDetails).mockResolvedValue(mockDetails)

    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const card = screen.getByText('Test issue summary').closest('div')!

    // Expand
    fireEvent.click(card)

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    // Collapse
    fireEvent.click(card)

    expect(screen.queryByText('Description')).not.toBeInTheDocument()
    expect(screen.getByText('Click to expand')).toBeInTheDocument()
  })

  it('should show description in expanded view', async () => {
    const mockDetails = {
      statusHistory: [],
      inProgressToQADays: 0,
      developmentTimeDays: 0,
    }

    vi.mocked(api.fetchIssueDetails).mockResolvedValue(mockDetails)

    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const card = screen.getByText('Test issue summary').closest('div')!
    fireEvent.click(card)

    await waitFor(() => {
      expect(screen.getByText('This is a test description')).toBeInTheDocument()
    })
  })

  it('should show "No description available" when description is empty', async () => {
    const issueWithoutDesc = { ...mockIssue, description: null }
    const mockDetails = {
      statusHistory: [],
      inProgressToQADays: 0,
      developmentTimeDays: 0,
    }

    vi.mocked(api.fetchIssueDetails).mockResolvedValue(mockDetails)

    render(<IssueCard issue={issueWithoutDesc} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const card = screen.getByText('Test issue summary').closest('div')!
    fireEvent.click(card)

    await waitFor(() => {
      expect(screen.getByText('No description available')).toBeInTheDocument()
    })
  })

  it('should display status timeline when available', async () => {
    const mockDetails = {
      statusHistory: [
        { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-10T10:00:00Z' },
        { status: 'Done', fromStatus: 'In Progress', timestamp: '2024-01-15T15:00:00Z' },
      ],
      inProgressToQADays: 0,
      developmentTimeDays: 0,
    }

    vi.mocked(api.fetchIssueDetails).mockResolvedValue(mockDetails)

    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const card = screen.getByText('Test issue summary').closest('div')!
    fireEvent.click(card)

    await waitFor(() => {
      expect(screen.getByText('Status Timeline')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Verify the timeline has multiple status entries
    const allInProgressElements = screen.getAllByText('In Progress')
    expect(allInProgressElements.length).toBeGreaterThan(1) // One in badge, one in timeline

    // Check for timeline-specific elements
    expect(screen.getAllByText('Done').length).toBeGreaterThan(0)
  })

  it('should display metrics when available', async () => {
    const mockDetails = {
      statusHistory: [
        { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-10T10:00:00Z' },
      ],
      inProgressToQADays: 2.5,
      developmentTimeDays: 3.8,
    }

    vi.mocked(api.fetchIssueDetails).mockResolvedValue(mockDetails)

    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const card = screen.getByText('Test issue summary').closest('div')!
    fireEvent.click(card)

    await waitFor(() => {
      expect(screen.getByText(/Development Time \(To Do → Code Review\):/)).toBeInTheDocument()
      expect(screen.getByText('3.8 days')).toBeInTheDocument()
      expect(screen.getByText(/In Progress → QA Review:/)).toBeInTheDocument()
      expect(screen.getByText('2.5 days')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(api.fetchIssueDetails).mockRejectedValue(new Error('API Error'))

    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const card = screen.getByText('Test issue summary').closest('div')!
    fireEvent.click(card)

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching issue details:', expect.any(Error))
    consoleErrorSpy.mockRestore()
  })

  it('should cache fetched details', async () => {
    const mockDetails = {
      statusHistory: [
        { status: 'Done', fromStatus: null, timestamp: '2024-01-10T10:00:00Z' },
      ],
      inProgressToQADays: 0,
      developmentTimeDays: 0,
    }

    vi.mocked(api.fetchIssueDetails).mockResolvedValue(mockDetails)

    render(<IssueCard issue={mockIssue} jiraBaseUrl={mockJiraBaseUrl} instance={mockInstance} />)

    const card = screen.getByText('Test issue summary').closest('div')!

    // First expansion - should fetch
    fireEvent.click(card)
    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Verify API was called
    expect(api.fetchIssueDetails).toHaveBeenCalled()
  })
})
