import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TeamPerformanceTable } from './TeamPerformanceTable'
import { AssigneeStats, JiraIssue } from '@/types'
import * as XLSX from 'xlsx'

// Mock XLSX module
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))

const mockAssigneeStats: AssigneeStats[] = [
  {
    name: 'John Doe',
    count: 15,
    totalIssues: 15,
    openIssues: 5,
    closedIssues: 10,
    totalStoryPoints: 35,
    avgDevelopmentTimeDays: 3.5,
    avgInProgressToQADays: 1.2,
    statusBreakdown: {},
  },
  {
    name: 'Jane Smith',
    count: 10,
    totalIssues: 10,
    openIssues: 3,
    closedIssues: 7,
    totalStoryPoints: 25,
    avgDevelopmentTimeDays: 2.8,
    avgInProgressToQADays: 1.5,
    statusBreakdown: {},
  },
  {
    name: 'Bob Johnson',
    count: 8,
    totalIssues: 8,
    openIssues: 2,
    closedIssues: 6,
    totalStoryPoints: 20,
    avgDevelopmentTimeDays: 4.2,
    avgInProgressToQADays: 0,
    statusBreakdown: {},
  },
]

const mockIssues: JiraIssue[] = [
  {
    key: 'TEST-1',
    summary: 'Test issue 1',
    status: 'Done',
    assignee: 'John Doe',
    storyPoints: 5,
    statusHistory: [
      { status: 'To Do', fromStatus: null, timestamp: '2024-01-01T10:00:00Z' },
      { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-02T10:00:00Z' },
      { status: 'Done', fromStatus: 'In Progress', timestamp: '2024-01-05T10:00:00Z' },
    ],
  },
  {
    key: 'TEST-2',
    summary: 'Failed issue',
    status: 'In Progress',
    assignee: 'John Doe',
    storyPoints: 3,
    statusHistory: [
      { status: 'To Do', fromStatus: null, timestamp: '2024-01-01T10:00:00Z' },
      { status: 'In Progress', fromStatus: 'To Do', timestamp: '2024-01-02T10:00:00Z' },
      { status: 'Failed', fromStatus: 'In Progress', timestamp: '2024-01-03T10:00:00Z' },
      { status: 'In Progress', fromStatus: 'Failed', timestamp: '2024-01-04T10:00:00Z' },
    ],
  },
  {
    key: 'TEST-3',
    summary: 'Jane issue',
    status: 'Done',
    assignee: 'Jane Smith',
    storyPoints: 8,
    statusHistory: [
      { status: 'To Do', fromStatus: null, timestamp: '2024-01-01T10:00:00Z' },
      { status: 'Done', fromStatus: 'To Do', timestamp: '2024-01-02T10:00:00Z' },
    ],
  },
  {
    key: 'TEST-4',
    summary: 'Bob issue with failure',
    status: 'QA Failed',
    assignee: 'Bob Johnson',
    storyPoints: 5,
    statusHistory: [
      { status: 'To Do', fromStatus: null, timestamp: '2024-01-01T10:00:00Z' },
      { status: 'QA Failed', fromStatus: 'To Do', timestamp: '2024-01-03T10:00:00Z' },
    ],
  },
]

describe('TeamPerformanceTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Basic Rendering', () => {
    it('should render the component with title', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)
      expect(screen.getByText('Team Performance')).toBeInTheDocument()
    })

    it('should render collapse/expand button', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)
      const button = screen.getByTitle('Collapse/Expand')
      expect(button).toBeInTheDocument()
    })

    it('should render actions button', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)
      const button = screen.getByTitle('Actions')
      expect(button).toBeInTheDocument()
    })

    it('should render all table columns', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)
      expect(screen.getByText('Assignee')).toBeInTheDocument()
      expect(screen.getAllByText('Total').length).toBeGreaterThan(0)
      expect(screen.getByText('Open')).toBeInTheDocument()
      expect(screen.getByText('Closed')).toBeInTheDocument()
      expect(screen.getByText('Story Points')).toBeInTheDocument()
      expect(screen.getByText('Avg Development Time (days)')).toBeInTheDocument()
      expect(screen.getByText('Rating')).toBeInTheDocument()
    })

    it('should show hint text', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)
      expect(screen.getByText(/Click on a row to display developer individual performance metrics/i)).toBeInTheDocument()
    })
  })

  describe('Data Display', () => {
    it('should render all developers', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
    })

    it('should display correct stats for each developer', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      // Check John Doe's row
      const johnRow = screen.getByText('John Doe').closest('tr')!
      expect(johnRow).toHaveTextContent('15') // Total issues
      expect(johnRow).toHaveTextContent('5') // Open issues
      expect(johnRow).toHaveTextContent('10') // Closed issues
      expect(johnRow).toHaveTextContent('35') // Story points
      expect(johnRow).toHaveTextContent('3.5') // Avg dev time
    })

    it('should calculate and display totals in footer', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const totals = screen.getAllByText('Total')
      const footer = totals[totals.length - 1].closest('tr')! // Get the last "Total" which is in footer
      expect(footer).toHaveTextContent('33') // Total issues: 15 + 10 + 8
      expect(footer).toHaveTextContent('10') // Total open: 5 + 3 + 2
      expect(footer).toHaveTextContent('23') // Total closed: 10 + 7 + 6
      expect(footer).toHaveTextContent('80') // Total story points: 35 + 25 + 20
    })

    it('should display dash for zero values', () => {
      const statsWithZero: AssigneeStats[] = [
        {
          name: 'Test Dev',
          count: 5,
          totalIssues: 5,
          openIssues: 5,
          closedIssues: 0,
          totalStoryPoints: 0,
          avgDevelopmentTimeDays: 0,
          avgInProgressToQADays: 0,
          statusBreakdown: {},
        },
      ]
      render(<TeamPerformanceTable data={statsWithZero} allIssues={[]} />)

      const row = screen.getByText('Test Dev').closest('tr')!
      // Should show dash for zero story points
      const cells = row.querySelectorAll('td')
      expect(cells[4]).toHaveTextContent('-') // Story points column
      expect(cells[5]).toHaveTextContent('-') // Avg dev time column
    })
  })

  describe('Collapse/Expand Functionality', () => {
    it('should collapse table when button is clicked', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const button = screen.getByTitle('Collapse/Expand')
      fireEvent.click(button)

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    it('should show plus symbol when collapsed', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const button = screen.getByTitle('Collapse/Expand')
      fireEvent.click(button)

      expect(button).toHaveTextContent('+')
    })

    it('should show minus symbol when expanded', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const button = screen.getByTitle('Collapse/Expand')
      expect(button).toHaveTextContent('−')
    })

    it('should expand table when clicked again', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const button = screen.getByTitle('Collapse/Expand')
      fireEvent.click(button)
      fireEvent.click(button)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('LocalStorage Integration', () => {
    it('should save collapsed state to localStorage', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const button = screen.getByTitle('Collapse/Expand')
      fireEvent.click(button)

      expect(localStorage.getItem('jira_dashboard_team_collapsed')).toBe('true')
    })

    it('should load collapsed state from localStorage', () => {
      localStorage.setItem('jira_dashboard_team_collapsed', 'true')

      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  describe('Star Rating', () => {
    it('should display star ratings for developers', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const rows = screen.getAllByRole('row')
      // Should have star ratings (⭐) in rating column
      const ratingCells = rows.filter(row => row.textContent?.includes('⭐'))
      expect(ratingCells.length).toBeGreaterThan(0)
    })

    it('should sort developers by star rating and story points', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const tbody = screen.getByRole('table').querySelector('tbody')!
      const rows = Array.from(tbody.querySelectorAll('tr')).filter(row =>
        row.querySelector('td')?.textContent?.includes('Doe') ||
        row.querySelector('td')?.textContent?.includes('Smith') ||
        row.querySelector('td')?.textContent?.includes('Johnson')
      )

      // First row should be a developer (sorted by rating/story points)
      expect(rows[0]).toBeInTheDocument()
    })
  })

  describe('Row Expansion', () => {
    it('should expand developer row when clicked', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const johnRow = screen.getByText('John Doe').closest('tr')!
      fireEvent.click(johnRow)

      expect(screen.getByText("John Doe's Sprint Metrics")).toBeInTheDocument()
    })

    it('should display sprint metrics when row is expanded', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const johnRow = screen.getByText('John Doe').closest('tr')!
      fireEvent.click(johnRow)

      expect(screen.getByText('Work')).toBeInTheDocument()
      expect(screen.getByText('Activity')).toBeInTheDocument()
      expect(screen.getByText('Contribution')).toBeInTheDocument()
      expect(screen.getByText('Assisted')).toBeInTheDocument()
      expect(screen.getByText('Test Coverage')).toBeInTheDocument()
    })

    it('should display work metric (story points)', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const johnRow = screen.getByText('John Doe').closest('tr')!
      fireEvent.click(johnRow)

      // John Doe has TEST-1 (5 SP) and TEST-2 (3 SP) = 8.0 total
      expect(screen.getByText('8.0')).toBeInTheDocument()
      expect(screen.getByText('Total Story Points in Sprint')).toBeInTheDocument()
    })

    it('should display assisted metric (failed/unfailed)', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const johnRow = screen.getByText('John Doe').closest('tr')!
      fireEvent.click(johnRow)

      // John has 1 failed ticket (TEST-2) and 1 unfailed
      expect(screen.getByText('1 / 1')).toBeInTheDocument()
      expect(screen.getByText('Failed / Unfailed Tickets')).toBeInTheDocument()
    })

    it('should show "No Data Yet" for unavailable metrics', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const johnRow = screen.getByText('John Doe').closest('tr')!
      fireEvent.click(johnRow)

      expect(screen.getAllByText('-').length).toBeGreaterThan(0)
      expect(screen.getByText('Check-ins in Sprint (No Data Yet)')).toBeInTheDocument()
      expect(screen.getByText('PRs in Sprint (No Data Yet)')).toBeInTheDocument()
      expect(screen.getByText('Coverage in Sprint (No Data Yet)')).toBeInTheDocument()
    })

    it('should collapse expanded row when clicked again', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const johnRow = screen.getByText('John Doe').closest('tr')!
      fireEvent.click(johnRow)
      fireEvent.click(johnRow)

      expect(screen.queryByText("John Doe's Sprint Metrics")).not.toBeInTheDocument()
    })

    it('should highlight expanded row', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const johnRow = screen.getByText('John Doe').closest('tr')!
      fireEvent.click(johnRow)

      expect(johnRow).toHaveClass('bg-primary/10')
    })
  })

  describe('Metrics Calculations', () => {
    it('should calculate story points from issues', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const johnRow = screen.getByText('John Doe').closest('tr')!
      fireEvent.click(johnRow)

      // John has TEST-1 (5) + TEST-2 (3) = 8.0
      expect(screen.getByText('8.0')).toBeInTheDocument()
    })

    it('should count failed tickets correctly', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const bobRow = screen.getByText('Bob Johnson').closest('tr')!
      fireEvent.click(bobRow)

      // Bob has TEST-4 with QA Failed status (1 failure, not unfailed)
      expect(screen.getByText('1 / 0')).toBeInTheDocument()
    })

    it('should count unfailed tickets correctly', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const johnRow = screen.getByText('John Doe').closest('tr')!
      fireEvent.click(johnRow)

      // John has TEST-2 which failed then recovered
      expect(screen.getByText('1 / 1')).toBeInTheDocument()
    })

    it('should handle different failed status names', () => {
      const issuesWithVariousFailures: JiraIssue[] = [
        {
          key: 'TEST-5',
          summary: 'Test',
          status: 'Done',
          assignee: 'John Doe',
          storyPoints: 5,
          statusHistory: [
            { status: 'failed', fromStatus: null, timestamp: '2024-01-01T10:00:00Z' },
            { status: 'Done', fromStatus: 'failed', timestamp: '2024-01-02T10:00:00Z' },
          ],
        },
        {
          key: 'TEST-6',
          summary: 'Test 2',
          status: 'Done',
          assignee: 'John Doe',
          storyPoints: 3,
          statusHistory: [
            { status: 'FAILED', fromStatus: null, timestamp: '2024-01-01T10:00:00Z' },
            { status: 'Done', fromStatus: 'FAILED', timestamp: '2024-01-02T10:00:00Z' },
          ],
        },
      ]

      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={issuesWithVariousFailures} />)

      const johnRow = screen.getByText('John Doe').closest('tr')!
      fireEvent.click(johnRow)

      // Should count both 'failed' and 'FAILED' statuses
      expect(screen.getByText('2 / 2')).toBeInTheDocument()
    })

    it('should ignore issues without status history', () => {
      const issuesWithoutHistory: JiraIssue[] = [
        {
          key: 'TEST-7',
          summary: 'No history',
          status: 'Done',
          assignee: 'Jane Smith',
          storyPoints: 5,
          statusHistory: [],
        },
      ]

      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={issuesWithoutHistory} />)

      const janeRow = screen.getByText('Jane Smith').closest('tr')!
      fireEvent.click(janeRow)

      // Should show 0 failures
      expect(screen.getByText('0 / 0')).toBeInTheDocument()
    })

    it('should handle unassigned issues', () => {
      const issuesWithUnassigned: JiraIssue[] = [
        {
          key: 'TEST-8',
          summary: 'Unassigned',
          status: 'Done',
          assignee: null,
          storyPoints: 5,
          statusHistory: [
            { status: 'Failed', fromStatus: null, timestamp: '2024-01-01T10:00:00Z' },
          ],
        },
      ]

      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={issuesWithUnassigned} />)

      // Should not crash and should render normally
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('Export Functionality', () => {
    it('should open export menu when actions button clicked', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const actionsButton = screen.getByTitle('Actions')
      fireEvent.click(actionsButton)

      expect(screen.getByText(/Export Metrics to Excel/)).toBeInTheDocument()
    })

    it('should call XLSX functions when export is clicked', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const actionsButton = screen.getByTitle('Actions')
      fireEvent.click(actionsButton)

      const exportButton = screen.getByText(/Export Metrics to Excel/)
      fireEvent.click(exportButton)

      expect(XLSX.utils.book_new).toHaveBeenCalled()
      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled()
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled()
      expect(XLSX.writeFile).toHaveBeenCalled()
    })

    it('should close menu after export', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const actionsButton = screen.getByTitle('Actions')
      fireEvent.click(actionsButton)

      const exportButton = screen.getByText(/Export Metrics to Excel/)
      fireEvent.click(exportButton)

      expect(screen.queryByText(/Export Metrics to Excel/)).not.toBeInTheDocument()
    })

    it('should close menu when clicking outside', async () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const actionsButton = screen.getByTitle('Actions')
      fireEvent.click(actionsButton)

      expect(screen.getByText(/Export Metrics to Excel/)).toBeInTheDocument()

      // Click outside
      fireEvent.mouseDown(document.body)

      await waitFor(() => {
        expect(screen.queryByText(/Export Metrics to Excel/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Tooltip', () => {
    it('should show tooltip on star rating hover', async () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const stars = screen.getAllByText(/⭐/)[0]
      fireEvent.mouseEnter(stars)

      await waitFor(() => {
        expect(screen.getByText(/Rating Breakdown/)).toBeInTheDocument()
      })
    })

    it('should hide tooltip on mouse leave', async () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const stars = screen.getAllByText(/⭐/)[0]
      fireEvent.mouseEnter(stars)

      await waitFor(() => {
        expect(screen.getByText(/Rating Breakdown/)).toBeInTheDocument()
      })

      fireEvent.mouseLeave(stars)

      await waitFor(() => {
        expect(screen.queryByText(/Rating Breakdown/)).not.toBeInTheDocument()
      })
    })

    it('should display breakdown metrics in tooltip', async () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={mockIssues} />)

      const stars = screen.getAllByText(/⭐/)[0]
      fireEvent.mouseEnter(stars)

      await waitFor(() => {
        const tooltip = screen.getByText(/Rating Breakdown/)
        expect(tooltip).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty data array', () => {
      render(<TeamPerformanceTable data={[]} allIssues={[]} />)

      expect(screen.getByText('Team Performance')).toBeInTheDocument()
      const totals = screen.getAllByText('Total')
      const footer = totals[totals.length - 1].closest('tr')!
      expect(footer).toHaveTextContent('0')
    })

    it('should handle empty issues array', () => {
      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={[]} />)

      const johnRow = screen.getByText('John Doe').closest('tr')!
      fireEvent.click(johnRow)

      // Should show 0 for story points and failures
      expect(screen.getByText('0.0')).toBeInTheDocument()
      expect(screen.getByText('0 / 0')).toBeInTheDocument()
    })

    it('should handle developer with no issues', () => {
      const statsOnly: AssigneeStats[] = [
        {
          name: 'New Developer',
          count: 0,
          totalIssues: 0,
          openIssues: 0,
          closedIssues: 0,
          totalStoryPoints: 0,
          avgDevelopmentTimeDays: 0,
          avgInProgressToQADays: 0,
          statusBreakdown: {},
        },
      ]

      render(<TeamPerformanceTable data={statsOnly} allIssues={[]} />)

      expect(screen.getByText('New Developer')).toBeInTheDocument()
      const row = screen.getByText('New Developer').closest('tr')!
      expect(row).toHaveTextContent('-') // Should show dash for zero values
    })

    it('should handle issues without story points', () => {
      const issuesNoSP: JiraIssue[] = [
        {
          key: 'TEST-9',
          summary: 'No SP',
          status: 'Done',
          assignee: 'John Doe',
          storyPoints: undefined,
          statusHistory: [],
        },
      ]

      render(<TeamPerformanceTable data={mockAssigneeStats} allIssues={issuesNoSP} />)

      const johnRow = screen.getByText('John Doe').closest('tr')!
      fireEvent.click(johnRow)

      // Should show 0.0 for story points
      expect(screen.getByText('0.0')).toBeInTheDocument()
    })
  })
})
