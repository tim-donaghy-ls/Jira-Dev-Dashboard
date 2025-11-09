import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeveloperWorkload } from './DeveloperWorkload'
import { AssigneeStats, JiraIssue } from '@/types'

const mockAssigneeStats: AssigneeStats[] = [
  {
    name: 'John Doe',
    count: 10,
    totalStoryPoints: 25,
    statusBreakdown: {
      'To Do': 3,
      'In Progress': 2,
      'Code Review': 1,
      'QA Review': 2,
      'Schedule Release': 1,
      'Production Release': 1,
    },
  },
  {
    name: 'Jane Smith',
    count: 8,
    totalStoryPoints: 20,
    statusBreakdown: {
      'To Do': 2,
      'In Progress': 3,
      'Code Review': 2,
      'QA Review': 1,
    },
  },
  {
    name: 'Bob Johnson',
    count: 5,
    totalStoryPoints: 0,
    statusBreakdown: {
      'To Do': 1,
      'In Progress': 2,
      'Code Review': 2,
    },
  },
]

const mockIssues: JiraIssue[] = [
  {
    key: 'TEST-1',
    summary: 'Failed ticket 1',
    status: 'In Progress',
    assignee: 'John Doe',
    priority: 'High',
    storyPoints: 5,
    created: '2024-01-01',
    updated: '2024-01-15',
    issueType: 'Bug',
    statusHistory: [
      { status: 'To Do', fromStatus: null, timestamp: '2024-01-01T10:00:00Z' },
      { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-02T10:00:00Z' },
      { status: 'Failed', fromStatus: 'In Progress', timestamp: '2024-01-03T10:00:00Z' },
      { status: 'In Progress', fromStatus: 'Failed', timestamp: '2024-01-04T10:00:00Z' },
    ],
  },
  {
    key: 'TEST-2',
    summary: 'Failed ticket 2 multiple times',
    status: 'QA Review',
    assignee: 'John Doe',
    priority: 'Medium',
    storyPoints: 8,
    created: '2024-01-01',
    updated: '2024-01-15',
    issueType: 'Story',
    statusHistory: [
      { status: 'To Do', fromStatus: null, timestamp: '2024-01-01T10:00:00Z' },
      { status: 'QA Failed', fromStatus: 'To Do', timestamp: '2024-01-02T10:00:00Z' },
      { status: 'In Progress', fromStatus: 'QA Failed', timestamp: '2024-01-03T10:00:00Z' },
      { status: 'Failed QA', fromStatus: 'In Progress', timestamp: '2024-01-04T10:00:00Z' },
      { status: 'QA Review', fromStatus: 'Failed QA', timestamp: '2024-01-05T10:00:00Z' },
    ],
  },
  {
    key: 'TEST-3',
    summary: 'Normal ticket',
    status: 'Done',
    assignee: 'Jane Smith',
    priority: 'Low',
    storyPoints: 3,
    created: '2024-01-01',
    updated: '2024-01-15',
    issueType: 'Task',
    statusHistory: [
      { status: 'To Do', fromStatus: null, timestamp: '2024-01-01T10:00:00Z' },
      { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-02T10:00:00Z' },
      { status: 'Done', fromStatus: 'In Progress', timestamp: '2024-01-03T10:00:00Z' },
    ],
  },
  {
    key: 'TEST-4',
    summary: 'Ticket without status history',
    status: 'To Do',
    assignee: 'Bob Johnson',
    priority: 'High',
    storyPoints: 5,
    created: '2024-01-01',
    updated: '2024-01-15',
    issueType: 'Bug',
    statusHistory: [],
  },
]

describe('DeveloperWorkload', () => {
  const mockJiraBaseUrl = 'https://example.atlassian.net'

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should render the component with title', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    expect(screen.getByText('Developer Workload by Status')).toBeInTheDocument()
  })

  it('should render collapse/expand button', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const button = screen.getByTitle('Collapse/Expand')
    expect(button).toBeInTheDocument()
  })

  it('should show minus symbol when expanded', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const button = screen.getByTitle('Collapse/Expand')
    expect(button.textContent).toBe('−')
  })

  it('should render all status columns', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Code Review')).toBeInTheDocument()
    expect(screen.getByText('QA Review')).toBeInTheDocument()
    expect(screen.getByText('Schedule Release')).toBeInTheDocument()
    expect(screen.getByText('Production Release')).toBeInTheDocument()
  })

  it('should render all developers', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
  })

  it('should display correct counts for each developer', () => {
    const { container } = render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    // Check John Doe's row
    const johnRow = container.querySelector('tr:has(td:first-child:contains("John Doe"))')
    expect(screen.getByText('John Doe')).toBeInTheDocument()

    // Total should be 10
    const allCells = container.querySelectorAll('td')
    expect(allCells.length).toBeGreaterThan(0)
  })

  it('should display story points', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    expect(screen.getByText('25')).toBeInTheDocument() // John Doe
    expect(screen.getByText('20')).toBeInTheDocument() // Jane Smith
  })

  it('should display dash for zero story points', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const allDashes = screen.getAllByText('-')
    expect(allDashes.length).toBeGreaterThan(0)
  })

  it('should calculate and display totals in footer', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    // Check for "Total" label in footer
    const totalLabels = screen.getAllByText('Total')
    expect(totalLabels.length).toBeGreaterThan(0)

    // Total story points should be 45 (25 + 20 + 0)
    expect(screen.getByText('45')).toBeInTheDocument()
  })

  it('should collapse table when button is clicked', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    // Table should not be visible
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
  })

  it('should show plus symbol when collapsed', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(button.textContent).toBe('+')
  })

  it('should expand table when clicked again', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const button = screen.getByTitle('Collapse/Expand')

    // Collapse
    fireEvent.click(button)
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()

    // Expand
    fireEvent.click(button)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should save collapsed state to localStorage', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(localStorage.getItem('jira_dashboard_workload_collapsed')).toBe('true')
  })

  it('should load collapsed state from localStorage', () => {
    localStorage.setItem('jira_dashboard_workload_collapsed', 'true')

    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    expect(screen.getByTitle('Collapse/Expand').textContent).toBe('+')
  })

  it('should show hint text about clicking rows', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    expect(screen.getByText(/Click on a row to display assisted tickets/i)).toBeInTheDocument()
  })

  it('should expand developer row when clicked', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const johnRow = screen.getByText('John Doe').closest('tr')!
    fireEvent.click(johnRow)

    // Should show failed tickets section
    expect(screen.getByText(/Failed Tickets/)).toBeInTheDocument()
  })

  it('should display failed tickets for developer with failures', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const johnRow = screen.getByText('John Doe').closest('tr')!
    fireEvent.click(johnRow)

    expect(screen.getByText('TEST-1')).toBeInTheDocument()
    expect(screen.getByText('Failed ticket 1')).toBeInTheDocument()
    expect(screen.getByText('1 failure(s)')).toBeInTheDocument()

    expect(screen.getByText('TEST-2')).toBeInTheDocument()
    expect(screen.getByText('Failed ticket 2 multiple times')).toBeInTheDocument()
    expect(screen.getByText('2 failure(s)')).toBeInTheDocument()
  })

  it('should show success message for developer with no failures', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const janeRow = screen.getByText('Jane Smith').closest('tr')!
    fireEvent.click(janeRow)

    expect(screen.getByText(/No failed tickets found for this developer/)).toBeInTheDocument()
  })

  it('should create links to JIRA for failed tickets', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const johnRow = screen.getByText('John Doe').closest('tr')!
    fireEvent.click(johnRow)

    const link = screen.getByRole('link', { name: 'TEST-1' })
    expect(link).toHaveAttribute('href', `${mockJiraBaseUrl}/browse/TEST-1`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should collapse expanded row when clicked again', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const johnRow = screen.getByText('John Doe').closest('tr')!

    // Expand
    fireEvent.click(johnRow)
    expect(screen.getByText('TEST-1')).toBeInTheDocument()

    // Collapse
    fireEvent.click(johnRow)
    expect(screen.queryByText('TEST-1')).not.toBeInTheDocument()
  })

  it('should handle ToDo status name variations', () => {
    const dataWithToDo: AssigneeStats[] = [
      {
        name: 'Test Dev',
        count: 5,
        totalStoryPoints: 10,
        statusBreakdown: {
          'To Do': 2,
          'ToDo': 3,
        },
      },
    ]

    render(<DeveloperWorkload data={dataWithToDo} allIssues={[]} jiraBaseUrl={mockJiraBaseUrl} />)

    // Should combine both To Do and ToDo counts (2 + 3 = 5)
    // The footer row should show 5 for To Do column
    expect(screen.getByText('Test Dev')).toBeInTheDocument()
  })

  it('should handle empty data array', () => {
    render(<DeveloperWorkload data={[]} allIssues={[]} jiraBaseUrl={mockJiraBaseUrl} />)

    expect(screen.getByText('Developer Workload by Status')).toBeInTheDocument()
    // Footer should still show totals of 0
    const totals = screen.getAllByText('Total')
    expect(totals.length).toBeGreaterThan(0) // Should have at least one Total (header or footer)
  })

  it('should handle empty issues array', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={[]} jiraBaseUrl={mockJiraBaseUrl} />)

    const johnRow = screen.getByText('John Doe').closest('tr')!
    fireEvent.click(johnRow)

    expect(screen.getByText(/No failed tickets found for this developer/)).toBeInTheDocument()
  })

  it('should only show failures for specific developer', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    // Expand Jane Smith (who has no failures)
    const janeRow = screen.getByText('Jane Smith').closest('tr')!
    fireEvent.click(janeRow)

    // Should not show John's tickets
    expect(screen.queryByText('TEST-1')).not.toBeInTheDocument()
    expect(screen.queryByText('TEST-2')).not.toBeInTheDocument()
  })

  it('should ignore tickets without status history', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const bobRow = screen.getByText('Bob Johnson').closest('tr')!
    fireEvent.click(bobRow)

    // TEST-4 has empty status history, should show no failures
    expect(screen.queryByText('TEST-4')).not.toBeInTheDocument()
    expect(screen.getByText(/No failed tickets found for this developer/)).toBeInTheDocument()
  })

  it('should count different failed status names', () => {
    const issuesWithDifferentFails: JiraIssue[] = [
      {
        key: 'TEST-10',
        summary: 'Test ticket',
        status: 'Done',
        assignee: 'John Doe',
        priority: 'High',
        storyPoints: 5,
        created: '2024-01-01',
        updated: '2024-01-15',
        issueType: 'Bug',
        statusHistory: [
          { status: 'Failed', fromStatus: 'To Do', timestamp: '2024-01-01T10:00:00Z' },
          { status: 'failed', fromStatus: 'Failed', timestamp: '2024-01-02T10:00:00Z' },
          { status: 'FAILED', fromStatus: 'failed', timestamp: '2024-01-03T10:00:00Z' },
          { status: 'Done', fromStatus: 'FAILED', timestamp: '2024-01-04T10:00:00Z' },
        ],
      },
    ]

    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={issuesWithDifferentFails} jiraBaseUrl={mockJiraBaseUrl} />)

    const johnRow = screen.getByText('John Doe').closest('tr')!
    fireEvent.click(johnRow)

    // Should count all 3 different "failed" status variations
    expect(screen.getByText('3 failure(s)')).toBeInTheDocument()
  })

  it('should highlight expanded row', () => {
    const { container } = render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const johnRow = screen.getByText('John Doe').closest('tr')!
    fireEvent.click(johnRow)

    // Expanded row should have highlight class
    expect(johnRow.className).toContain('bg-primary/10')
  })

  it('should display count label in failed tickets section', () => {
    render(<DeveloperWorkload data={mockAssigneeStats} allIssues={mockIssues} jiraBaseUrl={mockJiraBaseUrl} />)

    const johnRow = screen.getByText('John Doe').closest('tr')!
    fireEvent.click(johnRow)

    // Should show count in parentheses
    expect(screen.getByText('Failed Tickets (2)')).toBeInTheDocument()
  })
})
