import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChartsOverview } from './ChartsOverview'
import { StatusBreakdown, AssigneeStats, JiraIssue } from '@/types'

// Mock the chart components
vi.mock('./StatusChart', () => ({
  StatusChart: ({ data }: { data: StatusBreakdown }) => (
    <div data-testid="status-chart">Status Chart with {Object.keys(data).length} statuses</div>
  ),
}))

vi.mock('./DeveloperStoryPointsChart', () => ({
  DeveloperStoryPointsChart: () => (
    <div data-testid="dev-story-points-chart">Developer Story Points Chart</div>
  ),
}))

vi.mock('./DeveloperDevTimeChart', () => ({
  DeveloperDevTimeChart: () => (
    <div data-testid="dev-time-chart">Developer Dev Time Chart</div>
  ),
}))

vi.mock('./DeveloperWorkloadChart', () => ({
  DeveloperWorkloadChart: () => (
    <div data-testid="workload-chart">Developer Workload Chart</div>
  ),
}))

const mockStatusData: StatusBreakdown = {
  'To Do': 5,
  'In Progress': 8,
  'Done': 10,
}

const mockAssigneeStats: AssigneeStats[] = [
  {
    name: 'John Doe',
    totalIssues: 10,
    openIssues: 3,
    closedIssues: 7,
    totalStoryPoints: 23,
    avgDevelopmentTimeDays: 3.5,
    avgInProgressToQADays: 2.1,
  },
]

const mockAllIssues: JiraIssue[] = []

describe('ChartsOverview', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should render title', () => {
    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    expect(screen.getByText('Charts Overview')).toBeInTheDocument()
  })

  it('should render collapse/expand button', () => {
    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    const button = screen.getByTitle('Collapse/Expand')
    expect(button).toBeInTheDocument()
  })

  it('should show charts initially when not collapsed', () => {
    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    expect(screen.getByTestId('status-chart')).toBeInTheDocument()
    expect(screen.getByTestId('dev-story-points-chart')).toBeInTheDocument()
    expect(screen.getByTestId('dev-time-chart')).toBeInTheDocument()
    expect(screen.getByTestId('workload-chart')).toBeInTheDocument()
  })

  it('should show minus symbol when expanded', () => {
    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    const button = screen.getByTitle('Collapse/Expand')
    expect(button.textContent).toBe('−')
  })

  it('should collapse charts when button is clicked', () => {
    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(screen.queryByTestId('status-chart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-chart')).not.toBeInTheDocument()
  })

  it('should show plus symbol when collapsed', () => {
    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(button.textContent).toBe('+')
  })

  it('should expand charts when button is clicked again', () => {
    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    const button = screen.getByTitle('Collapse/Expand')

    // Collapse
    fireEvent.click(button)
    expect(screen.queryByTestId('status-chart')).not.toBeInTheDocument()

    // Expand
    fireEvent.click(button)
    expect(screen.getByTestId('status-chart')).toBeInTheDocument()
    expect(screen.getByTestId('status-chart')).toBeInTheDocument()
  })

  it('should save collapsed state to localStorage', () => {
    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(localStorage.getItem('jira_dashboard_charts_collapsed')).toBe('true')
  })

  it('should save expanded state to localStorage', () => {
    localStorage.setItem('jira_dashboard_charts_collapsed', 'true')

    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(localStorage.getItem('jira_dashboard_charts_collapsed')).toBe('false')
  })

  it('should load collapsed state from localStorage on mount', () => {
    localStorage.setItem('jira_dashboard_charts_collapsed', 'true')

    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    expect(screen.queryByTestId('status-chart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-chart')).not.toBeInTheDocument()
    expect(screen.getByTitle('Collapse/Expand').textContent).toBe('+')
  })

  it('should default to expanded when no localStorage value', () => {
    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    expect(screen.getByTestId('status-chart')).toBeInTheDocument()
    expect(screen.getByTestId('status-chart')).toBeInTheDocument()
    expect(screen.getByTitle('Collapse/Expand').textContent).toBe('−')
  })

  it('should pass status data to StatusChart', () => {
    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    expect(screen.getByText('Status Chart with 3 statuses')).toBeInTheDocument()
  })

  it('should pass data to developer charts', () => {
    render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    expect(screen.getByTestId('dev-story-points-chart')).toBeInTheDocument()
    expect(screen.getByTestId('dev-time-chart')).toBeInTheDocument()
    expect(screen.getByTestId('workload-chart')).toBeInTheDocument()
  })

  it('should apply correct styling to container', () => {
    const { container } = render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    const mainContainer = container.querySelector('.bg-container')
    expect(mainContainer).toBeInTheDocument()
    expect(mainContainer).toHaveClass('shadow-card')
    expect(mainContainer).toHaveClass('border')
    expect(mainContainer).toHaveClass('border-custom')
    expect(mainContainer).toHaveClass('rounded-lg')
  })

  it('should render charts in grid layout when expanded', () => {
    const { container } = render(<ChartsOverview statusData={mockStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toBeInTheDocument()
    expect(gridContainer).toHaveClass('grid-cols-1')
    expect(gridContainer).toHaveClass('md:grid-cols-2')
    expect(gridContainer).toHaveClass('lg:grid-cols-4')
  })

  it('should handle empty status data', () => {
    const emptyStatusData: StatusBreakdown = {}

    render(<ChartsOverview statusData={emptyStatusData} assigneeStats={mockAssigneeStats} allIssues={mockAllIssues} />)

    expect(screen.getByText('Status Chart with 0 statuses')).toBeInTheDocument()
  })

  it('should handle empty assignee data', () => {
    const emptyAssigneeStats: AssigneeStats[] = []

    render(<ChartsOverview statusData={mockStatusData} assigneeStats={emptyAssigneeStats} allIssues={mockAllIssues} />)

    expect(screen.getByTestId('dev-story-points-chart')).toBeInTheDocument()
  })
})
