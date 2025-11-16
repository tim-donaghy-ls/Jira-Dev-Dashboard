import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SprintSlippage } from '@/components/SprintSlippage'
import { JiraIssue, SprintInfo } from '@/types'

describe('SprintSlippage', () => {
  const mockJiraBaseUrl = 'https://example.atlassian.net'
  const mockSprintName = 'Sprint 42'

  const mockSprintInfo: SprintInfo = {
    name: 'Sprint 42',
    startDate: '2024-01-01',
    endDate: '2024-01-14',
  }

  const mockIssues: JiraIssue[] = [
    {
      key: 'TEST-1',
      summary: 'Completed ticket',
      status: 'Done',
      assignee: 'John Doe',
      priority: 'High',
      storyPoints: 5,
      created: '2024-01-01',
      updated: '2024-01-10',
      issueType: 'Story',
      statusHistory: [
        { status: 'To Do', fromStatus: null, timestamp: '2024-01-01T10:00:00Z' },
        { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-02T10:00:00Z' },
        { status: 'Done', fromStatus: 'In Progress', timestamp: '2024-01-10T10:00:00Z' },
      ],
    },
    {
      key: 'TEST-2',
      summary: 'Slipped ticket',
      status: 'In Progress',
      assignee: 'Jane Smith',
      priority: 'Medium',
      storyPoints: 8,
      created: '2024-01-02',
      updated: '2024-01-14',
      issueType: 'Story',
      statusHistory: [
        { status: 'To Do', fromStatus: null, timestamp: '2024-01-02T10:00:00Z' },
        { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-03T10:00:00Z' },
      ],
    },
    {
      key: 'TEST-3',
      summary: 'Another slipped ticket',
      status: 'Code Review',
      assignee: 'John Doe',
      priority: 'High',
      storyPoints: 3,
      created: '2024-01-03',
      updated: '2024-01-14',
      issueType: 'Bug',
      statusHistory: [
        { status: 'To Do', fromStatus: null, timestamp: '2024-01-03T10:00:00Z' },
        { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-04T10:00:00Z' },
        { status: 'Code Review', fromStatus: 'In Progress', timestamp: '2024-01-05T10:00:00Z' },
      ],
    },
    {
      key: 'TEST-4',
      summary: 'Never started ticket',
      status: 'To Do',
      assignee: 'Bob Johnson',
      priority: 'Low',
      storyPoints: 2,
      created: '2024-01-04',
      updated: '2024-01-14',
      issueType: 'Task',
      statusHistory: [
        { status: 'To Do', fromStatus: null, timestamp: '2024-01-04T10:00:00Z' },
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should render the component', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    expect(screen.getByText('Sprint Slippage')).toBeInTheDocument()
  })

  it('should display sprint name in description', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    expect(screen.getByText(/Sprint 42/)).toBeInTheDocument()
  })

  it('should display default sprint name when not provided', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
      />
    )

    expect(screen.getByText(/Current Sprint/)).toBeInTheDocument()
  })

  it('should calculate committed points correctly', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    // Committed points = tickets that were in progress (TEST-1: 5, TEST-2: 8, TEST-3: 3 = 16)
    expect(screen.getByText('16')).toBeInTheDocument()
  })

  it('should calculate completed points correctly', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    // Completed points = only TEST-1 (5 points)
    const completedCard = screen.getByText('Completed Points').closest('.bg-card')
    expect(completedCard).toBeInTheDocument()
    expect(completedCard?.textContent).toContain('5')
  })

  it('should calculate slipped points correctly', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    // Slipped points = committed - completed = 16 - 5 = 11
    const slippedCard = screen.getByText('Slipped Points').closest('.bg-card')
    expect(slippedCard).toBeInTheDocument()
    expect(slippedCard?.textContent).toContain('11')
  })

  it('should calculate slippage percentage correctly', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    // Slippage % = (11 / 16) * 100 = 68.75%
    expect(screen.getByText(/68\.8%|68\.7%/)).toBeInTheDocument()
  })

  it('should display slipped tickets grouped by assignee', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('should render collapse/expand button', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    const button = screen.getByTitle('Collapse/Expand')
    expect(button).toBeInTheDocument()
  })

  it('should collapse when collapse button is clicked', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(screen.queryByText('Committed Points')).not.toBeInTheDocument()
  })

  it('should show + symbol when collapsed', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(button.textContent).toBe('+')
  })

  it('should show − symbol when expanded', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    const button = screen.getByTitle('Collapse/Expand')
    expect(button.textContent).toBe('−')
  })

  it('should save collapsed state to localStorage', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(localStorage.getItem('jira_dashboard_slippage_collapsed')).toBe('true')
  })

  it('should load collapsed state from localStorage', () => {
    localStorage.setItem('jira_dashboard_slippage_collapsed', 'true')

    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    expect(screen.queryByText('Committed Points')).not.toBeInTheDocument()
  })

  it('should display slipped tickets with correct details', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    expect(screen.getByText('TEST-2')).toBeInTheDocument()
    expect(screen.getByText('Slipped ticket')).toBeInTheDocument()
    expect(screen.getByText('TEST-3')).toBeInTheDocument()
    expect(screen.getByText('Another slipped ticket')).toBeInTheDocument()
  })

  it('should create links to JIRA for slipped tickets', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    const link = screen.getByText('TEST-2').closest('a')
    expect(link).toHaveAttribute('href', `${mockJiraBaseUrl}/browse/TEST-2`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should sort slipped tickets by story points descending', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    // Jane Smith has TEST-2 with 8 points, John Doe has TEST-3 with 3 points
    const assignees = screen.getAllByText(/John Doe|Jane Smith/)
    const janeIndex = assignees.findIndex(el => el.textContent === 'Jane Smith')
    const johnIndex = assignees.findIndex(el => el.textContent === 'John Doe')

    // Jane should appear before John (8 points > 3 points)
    expect(janeIndex).toBeLessThan(johnIndex)
  })

  it('should display ticket count and points for each assignee', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    // Jane Smith: 1 ticket, 8 points
    const janeSection = screen.getByText('Jane Smith').closest('.bg-card')
    expect(janeSection?.textContent).toMatch(/1 ticket/)
    expect(janeSection?.textContent).toMatch(/8 points/)
  })

  it('should show no data message when no sprint data', () => {
    render(
      <SprintSlippage
        allIssues={[]}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    expect(screen.getByText('No sprint data available')).toBeInTheDocument()
  })

  it('should handle tickets without story points', () => {
    const issuesWithoutPoints: JiraIssue[] = [
      {
        key: 'TEST-10',
        summary: 'No points ticket',
        status: 'In Progress',
        assignee: 'John Doe',
        priority: 'High',
        storyPoints: 0,
        created: '2024-01-01',
        updated: '2024-01-14',
        issueType: 'Story',
        statusHistory: [
          { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-02T10:00:00Z' },
        ],
      },
    ]

    const { container } = render(
      <SprintSlippage
        allIssues={issuesWithoutPoints}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    // Check that the component renders (even with 0 points)
    const content = container.textContent || ''
    expect(content).toMatch(/Committed Points|Sprint Slippage/i)
  })

  it('should display urgent warning when days remaining <= 3', () => {
    const urgentSprintInfo: SprintInfo = {
      name: 'Sprint 42',
      startDate: '2024-01-01',
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    }

    const { container } = render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
        sprintInfo={urgentSprintInfo}
      />
    )

    // Check that the content includes urgent warning text
    const content = container.textContent || ''
    expect(content).toMatch(/ONLY.*\d+.*day.*remaining in the current sprint/i)
  })

  it('should display non-urgent info when days remaining > 3', () => {
    const nonUrgentSprintInfo: SprintInfo = {
      name: 'Sprint 42',
      startDate: '2024-01-01',
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    }

    const { container } = render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
        sprintInfo={nonUrgentSprintInfo}
      />
    )

    // Check that the content includes non-urgent info text (without "ONLY")
    const content = container.textContent || ''
    expect(content).toMatch(/\d+.*day.*remaining until the end of the current sprint/i)
  })

  it('should format ticket age correctly', () => {
    const { container } = render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    // Check that age is displayed in the content
    const content = container.textContent || ''
    expect(content).toMatch(/\d+\s+days?\s+ago/i)
  })

  it('should display table headers', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    const ticketHeaders = screen.getAllByText(/^Ticket$/i)
    expect(ticketHeaders.length).toBeGreaterThan(0)
    const summaryHeaders = screen.getAllByText(/^Summary$/i)
    expect(summaryHeaders.length).toBeGreaterThan(0)
    const statusHeaders = screen.getAllByText(/^Status$/i)
    expect(statusHeaders.length).toBeGreaterThan(0)
    const priorityHeaders = screen.getAllByText(/^Priority$/i)
    expect(priorityHeaders.length).toBeGreaterThan(0)
    const pointsHeaders = screen.getAllByText(/^Points$/i)
    expect(pointsHeaders.length).toBeGreaterThan(0)
    const ageHeaders = screen.getAllByText(/^Age$/i)
    expect(ageHeaders.length).toBeGreaterThan(0)
  })

  it('should show red styling for high slippage percentage', () => {
    const { container } = render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    // Slippage > 20% should be red
    const slippageCard = screen.getByText(/68\.\d%/).closest('.text-3xl')
    expect(slippageCard).toHaveClass('text-red-600')
  })

  it('should show orange styling for medium slippage percentage', () => {
    const mediumSlippageIssues: JiraIssue[] = [
      {
        key: 'TEST-1',
        summary: 'Done ticket',
        status: 'Done',
        assignee: 'John Doe',
        priority: 'High',
        storyPoints: 15,
        created: '2024-01-01',
        updated: '2024-01-10',
        issueType: 'Story',
        statusHistory: [
          { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-02T10:00:00Z' },
          { status: 'Done', fromStatus: 'In Progress', timestamp: '2024-01-10T10:00:00Z' },
        ],
      },
      {
        key: 'TEST-2',
        summary: 'Slipped ticket',
        status: 'In Progress',
        assignee: 'Jane Smith',
        priority: 'Medium',
        storyPoints: 2,
        created: '2024-01-02',
        updated: '2024-01-14',
        issueType: 'Story',
        statusHistory: [
          { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-03T10:00:00Z' },
        ],
      },
    ]

    const { container } = render(
      <SprintSlippage
        allIssues={mediumSlippageIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    // Slippage 11-20% should be orange
    const slippageText = screen.getByText(/11\.\d%|12\.\d%/)
    expect(slippageText).toHaveClass('text-orange-600')
  })

  it('should exclude tickets that were never in progress', () => {
    render(
      <SprintSlippage
        allIssues={mockIssues}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    // TEST-4 was never in progress, should not be in slipped tickets
    expect(screen.queryByText('Never started ticket')).not.toBeInTheDocument()
    expect(screen.queryByText('TEST-4')).not.toBeInTheDocument()
  })

  it('should handle tickets with missing status history', () => {
    const issuesWithoutHistory: JiraIssue[] = [
      {
        key: 'TEST-10',
        summary: 'No history ticket',
        status: 'To Do',
        assignee: 'John Doe',
        priority: 'High',
        storyPoints: 5,
        created: '2024-01-01',
        updated: '2024-01-14',
        issueType: 'Story',
      },
    ]

    render(
      <SprintSlippage
        allIssues={issuesWithoutHistory}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    expect(screen.getByText('No sprint data available')).toBeInTheDocument()
  })

  it('should handle unassigned tickets', () => {
    const unassignedIssue: JiraIssue[] = [
      {
        key: 'TEST-10',
        summary: 'Unassigned ticket',
        status: 'In Progress',
        assignee: null,
        priority: 'High',
        storyPoints: 5,
        created: '2024-01-01',
        updated: '2024-01-14',
        issueType: 'Story',
        statusHistory: [
          { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-02T10:00:00Z' },
        ],
      },
    ]

    render(
      <SprintSlippage
        allIssues={unassignedIssue}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('should recognize Schedule Release as completed', () => {
    const scheduledIssue: JiraIssue[] = [
      {
        key: 'TEST-10',
        summary: 'Scheduled ticket',
        status: 'Schedule Release',
        assignee: 'John Doe',
        priority: 'High',
        storyPoints: 5,
        created: '2024-01-01',
        updated: '2024-01-14',
        issueType: 'Story',
        statusHistory: [
          { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-02T10:00:00Z' },
          { status: 'Schedule Release', fromStatus: 'In Progress', timestamp: '2024-01-10T10:00:00Z' },
        ],
      },
    ]

    render(
      <SprintSlippage
        allIssues={scheduledIssue}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    // Should be counted as completed, not slipped
    expect(screen.queryByText('Scheduled ticket')).not.toBeInTheDocument()
  })

  it('should handle invalid date in ticket created field', () => {
    const invalidDateIssue: JiraIssue[] = [
      {
        key: 'TEST-10',
        summary: 'Invalid date ticket',
        status: 'In Progress',
        assignee: 'John Doe',
        priority: 'High',
        storyPoints: 5,
        created: 'invalid-date',
        updated: '2024-01-14',
        issueType: 'Story',
        statusHistory: [
          { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-02T10:00:00Z' },
        ],
      },
    ]

    render(
      <SprintSlippage
        allIssues={invalidDateIssue}
        jiraBaseUrl={mockJiraBaseUrl}
        currentSprintName={mockSprintName}
      />
    )

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })
})
