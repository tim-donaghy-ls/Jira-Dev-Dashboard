import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChartsOverview } from './ChartsOverview'
import { StatusBreakdown, PriorityBreakdown } from '@/types'

// Mock the chart components
vi.mock('./StatusChart', () => ({
  StatusChart: ({ data }: { data: StatusBreakdown }) => (
    <div data-testid="status-chart">Status Chart with {Object.keys(data).length} statuses</div>
  ),
}))

vi.mock('./PriorityChart', () => ({
  PriorityChart: ({ data }: { data: PriorityBreakdown }) => (
    <div data-testid="priority-chart">Priority Chart with {Object.keys(data).length} priorities</div>
  ),
}))

const mockStatusData: StatusBreakdown = {
  'To Do': 5,
  'In Progress': 8,
  'Done': 10,
}

const mockPriorityData: PriorityBreakdown = {
  'High': 7,
  'Medium': 12,
  'Low': 4,
}

describe('ChartsOverview', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should render title', () => {
    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    expect(screen.getByText('Charts Overview')).toBeInTheDocument()
  })

  it('should render collapse/expand button', () => {
    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    const button = screen.getByTitle('Collapse/Expand')
    expect(button).toBeInTheDocument()
  })

  it('should show charts initially when not collapsed', () => {
    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    expect(screen.getByTestId('status-chart')).toBeInTheDocument()
    expect(screen.getByTestId('priority-chart')).toBeInTheDocument()
  })

  it('should show minus symbol when expanded', () => {
    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    const button = screen.getByTitle('Collapse/Expand')
    expect(button.textContent).toBe('−')
  })

  it('should collapse charts when button is clicked', () => {
    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(screen.queryByTestId('status-chart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('priority-chart')).not.toBeInTheDocument()
  })

  it('should show plus symbol when collapsed', () => {
    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(button.textContent).toBe('+')
  })

  it('should expand charts when button is clicked again', () => {
    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    const button = screen.getByTitle('Collapse/Expand')

    // Collapse
    fireEvent.click(button)
    expect(screen.queryByTestId('status-chart')).not.toBeInTheDocument()

    // Expand
    fireEvent.click(button)
    expect(screen.getByTestId('status-chart')).toBeInTheDocument()
    expect(screen.getByTestId('priority-chart')).toBeInTheDocument()
  })

  it('should save collapsed state to localStorage', () => {
    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(localStorage.getItem('jira_dashboard_charts_collapsed')).toBe('true')
  })

  it('should save expanded state to localStorage', () => {
    localStorage.setItem('jira_dashboard_charts_collapsed', 'true')

    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    const button = screen.getByTitle('Collapse/Expand')
    fireEvent.click(button)

    expect(localStorage.getItem('jira_dashboard_charts_collapsed')).toBe('false')
  })

  it('should load collapsed state from localStorage on mount', () => {
    localStorage.setItem('jira_dashboard_charts_collapsed', 'true')

    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    expect(screen.queryByTestId('status-chart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('priority-chart')).not.toBeInTheDocument()
    expect(screen.getByTitle('Collapse/Expand').textContent).toBe('+')
  })

  it('should default to expanded when no localStorage value', () => {
    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    expect(screen.getByTestId('status-chart')).toBeInTheDocument()
    expect(screen.getByTestId('priority-chart')).toBeInTheDocument()
    expect(screen.getByTitle('Collapse/Expand').textContent).toBe('−')
  })

  it('should pass status data to StatusChart', () => {
    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    expect(screen.getByText('Status Chart with 3 statuses')).toBeInTheDocument()
  })

  it('should pass priority data to PriorityChart', () => {
    render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    expect(screen.getByText('Priority Chart with 3 priorities')).toBeInTheDocument()
  })

  it('should apply correct styling to container', () => {
    const { container } = render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    const mainContainer = container.querySelector('.bg-container')
    expect(mainContainer).toBeInTheDocument()
    expect(mainContainer).toHaveClass('shadow-card')
    expect(mainContainer).toHaveClass('border')
    expect(mainContainer).toHaveClass('border-custom')
    expect(mainContainer).toHaveClass('rounded-lg')
  })

  it('should render charts in grid layout when expanded', () => {
    const { container } = render(<ChartsOverview statusData={mockStatusData} priorityData={mockPriorityData} />)

    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toBeInTheDocument()
    expect(gridContainer).toHaveClass('grid-cols-1')
    expect(gridContainer).toHaveClass('md:grid-cols-2')
  })

  it('should handle empty status data', () => {
    const emptyStatusData: StatusBreakdown = {}

    render(<ChartsOverview statusData={emptyStatusData} priorityData={mockPriorityData} />)

    expect(screen.getByText('Status Chart with 0 statuses')).toBeInTheDocument()
  })

  it('should handle empty priority data', () => {
    const emptyPriorityData: PriorityBreakdown = {}

    render(<ChartsOverview statusData={mockStatusData} priorityData={emptyPriorityData} />)

    expect(screen.getByText('Priority Chart with 0 priorities')).toBeInTheDocument()
  })
})
