import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoryPointsWarning } from './StoryPointsWarning'
import { JiraIssue } from '@/types'

const mockIssuesWithoutPoints: JiraIssue[] = [
  {
    key: 'TEST-1',
    summary: 'Issue without story points',
    status: 'In Progress',
    assignee: 'John Doe',
    priority: 'High',
    storyPoints: 0,
    created: '2024-01-01',
    updated: '2024-01-02',
    type: 'Story',
    statusHistory: [],
  },
  {
    key: 'TEST-2',
    summary: 'Another issue without points',
    status: 'To Do',
    assignee: 'Jane Smith',
    priority: 'Medium',
    storyPoints: null,
    created: '2024-01-01',
    updated: '2024-01-02',
    type: 'Bug',
    statusHistory: [],
  },
]

const mockIssuesWithPoints: JiraIssue[] = [
  {
    key: 'TEST-3',
    summary: 'Issue with story points',
    status: 'Done',
    assignee: 'Bob Johnson',
    priority: 'Low',
    storyPoints: 5,
    created: '2024-01-01',
    updated: '2024-01-02',
    type: 'Story',
    statusHistory: [],
  },
]

describe('StoryPointsWarning', () => {
  const jiraBaseUrl = 'https://example.atlassian.net'

  it('should not render when all issues have story points', () => {
    const { container } = render(
      <StoryPointsWarning issues={mockIssuesWithPoints} jiraBaseUrl={jiraBaseUrl} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render warning when issues lack story points', () => {
    render(<StoryPointsWarning issues={mockIssuesWithoutPoints} jiraBaseUrl={jiraBaseUrl} />)

    // Check for the count
    expect(screen.getByText('2')).toBeInTheDocument()
    // Check for key text in the warning message
    expect(screen.getByText(/do not have story points assigned/i)).toBeInTheDocument()
  })

  it('should use singular form for single issue', () => {
    const singleIssue = [mockIssuesWithoutPoints[0]]
    render(<StoryPointsWarning issues={singleIssue} jiraBaseUrl={jiraBaseUrl} />)

    // Check for the count
    expect(screen.getByText('1')).toBeInTheDocument()
    // Check for singular form in the warning message
    expect(screen.getByText(/does not have story points assigned/i)).toBeInTheDocument()
  })

  it('should initially hide the list of issues', () => {
    render(<StoryPointsWarning issues={mockIssuesWithoutPoints} jiraBaseUrl={jiraBaseUrl} />)

    expect(screen.queryByText('TEST-1')).not.toBeInTheDocument()
    expect(screen.queryByText('TEST-2')).not.toBeInTheDocument()
  })

  it('should show issues list when toggle is clicked', () => {
    render(<StoryPointsWarning issues={mockIssuesWithoutPoints} jiraBaseUrl={jiraBaseUrl} />)

    const toggleButton = screen.getByText('Update These Tickets')
    fireEvent.click(toggleButton)

    expect(screen.getByText('TEST-1')).toBeInTheDocument()
    expect(screen.getByText('TEST-2')).toBeInTheDocument()
    expect(screen.getByText('Issue without story points')).toBeInTheDocument()
    expect(screen.getByText('Another issue without points')).toBeInTheDocument()
  })

  it('should toggle button text when expanded', () => {
    render(<StoryPointsWarning issues={mockIssuesWithoutPoints} jiraBaseUrl={jiraBaseUrl} />)

    const toggleButton = screen.getByText('Update These Tickets')
    fireEvent.click(toggleButton)

    expect(screen.getByText('Hide Tickets')).toBeInTheDocument()
  })

  it('should hide issues list when toggle is clicked again', () => {
    render(<StoryPointsWarning issues={mockIssuesWithoutPoints} jiraBaseUrl={jiraBaseUrl} />)

    const toggleButton = screen.getByText('Update These Tickets')
    fireEvent.click(toggleButton)
    fireEvent.click(screen.getByText('Hide Tickets'))

    expect(screen.queryByText('TEST-1')).not.toBeInTheDocument()
    expect(screen.queryByText('TEST-2')).not.toBeInTheDocument()
  })

  it('should render issue links with correct href', () => {
    render(<StoryPointsWarning issues={mockIssuesWithoutPoints} jiraBaseUrl={jiraBaseUrl} />)

    const toggleButton = screen.getByText('Update These Tickets')
    fireEvent.click(toggleButton)

    const link1 = screen.getByRole('link', { name: 'TEST-1' })
    expect(link1).toHaveAttribute('href', `${jiraBaseUrl}/browse/TEST-1`)
    expect(link1).toHaveAttribute('target', '_blank')
    expect(link1).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should apply correct warning styling', () => {
    const { container } = render(
      <StoryPointsWarning issues={mockIssuesWithoutPoints} jiraBaseUrl={jiraBaseUrl} />
    )

    const warningDiv = container.querySelector('.bg-yellow-50')
    expect(warningDiv).toBeInTheDocument()
    expect(warningDiv).toHaveClass('border-l-4')
    expect(warningDiv).toHaveClass('border-yellow-400')
  })

  it('should display warning icon', () => {
    const { container } = render(
      <StoryPointsWarning issues={mockIssuesWithoutPoints} jiraBaseUrl={jiraBaseUrl} />
    )

    const icon = container.querySelector('svg.text-yellow-400')
    expect(icon).toBeInTheDocument()
  })
})
