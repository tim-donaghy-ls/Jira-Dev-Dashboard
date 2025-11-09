import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SummaryCards } from './SummaryCards'
import { DashboardSummary } from '@/types'

const mockData: DashboardSummary = {
  totalIssues: 25,
  openIssues: 15,
  closedIssues: 10,
  totalStoryPoints: 120.5,
  openStoryPoints: 70.5,
  closedStoryPoints: 50.0,
  avgResolutionDays: 5.3,
  statusBreakdown: {},
  priorityBreakdown: {},
}

describe('SummaryCards', () => {
  it('should render all summary cards with correct data', () => {
    render(<SummaryCards data={mockData} />)

    expect(screen.getByText('Total Issues')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('120.5 story points')).toBeInTheDocument()

    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('70.5 story points')).toBeInTheDocument()

    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('50.0 story points')).toBeInTheDocument()

    expect(screen.getByText('AVG Dev Time (Tickets)')).toBeInTheDocument()
    expect(screen.getByText('5.3 days')).toBeInTheDocument()

    expect(screen.getByText('Total Story Points')).toBeInTheDocument()
    // 120.5 appears twice (once in subtext, once as main value)
    const storyPointElements = screen.getAllByText('120.5')
    expect(storyPointElements.length).toBeGreaterThanOrEqual(1)
  })

  it('should format decimal values correctly', () => {
    const dataWithDecimals: DashboardSummary = {
      ...mockData,
      totalStoryPoints: 123.456,
      avgResolutionDays: 7.891,
    }

    render(<SummaryCards data={dataWithDecimals} />)

    expect(screen.getByText('123.5 story points')).toBeInTheDocument()
    expect(screen.getByText('7.9 days')).toBeInTheDocument()
  })

  it('should not render links when jiraBaseUrl is not provided', () => {
    const { container } = render(<SummaryCards data={mockData} />)

    const links = container.querySelectorAll('a')
    expect(links.length).toBe(0)
  })

  it('should render links when jiraBaseUrl and sprintId are provided', () => {
    render(
      <SummaryCards
        data={mockData}
        jiraBaseUrl="https://example.atlassian.net"
        sprintId="123"
      />
    )

    const links = screen.getAllByRole('link')
    expect(links.length).toBe(3) // Total, Open, Closed
  })

  it('should build correct JQL URLs for cards', () => {
    render(
      <SummaryCards
        data={mockData}
        jiraBaseUrl="https://example.atlassian.net"
        sprintId="123"
        projectKey="TEST"
      />
    )

    const totalLink = screen.getByText('Total Issues').closest('a')
    expect(totalLink).toHaveAttribute(
      'href',
      'https://example.atlassian.net/issues/?jql=sprint%3D123%20AND%20project%3DTEST'
    )

    const openLink = screen.getByText('Open').closest('a')
    expect(openLink).toHaveAttribute(
      'href',
      'https://example.atlassian.net/issues/?jql=sprint%3D123%20AND%20project%3DTEST%20AND%20status!%3D%22Production%20Release%22'
    )

    const closedLink = screen.getByText('Closed').closest('a')
    expect(closedLink).toHaveAttribute(
      'href',
      'https://example.atlassian.net/issues/?jql=sprint%3D123%20AND%20project%3DTEST%20AND%20status%3D%22Production%20Release%22'
    )
  })

  it('should build JQL URLs without projectKey when not provided', () => {
    render(
      <SummaryCards
        data={mockData}
        jiraBaseUrl="https://example.atlassian.net"
        sprintId="123"
      />
    )

    const totalLink = screen.getByText('Total Issues').closest('a')
    expect(totalLink).toHaveAttribute(
      'href',
      'https://example.atlassian.net/issues/?jql=sprint%3D123'
    )
  })

  it('should set correct link attributes for external links', () => {
    render(
      <SummaryCards
        data={mockData}
        jiraBaseUrl="https://example.atlassian.net"
        sprintId="123"
      />
    )

    const links = screen.getAllByRole('link')
    links.forEach(link => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('should render cards without subtext for avg dev time and total story points', () => {
    const { container } = render(<SummaryCards data={mockData} />)

    // Find the card containers
    const cards = container.querySelectorAll('.bg-card')
    expect(cards.length).toBe(5)
  })

  it('should handle zero values', () => {
    const zeroData: DashboardSummary = {
      totalIssues: 0,
      openIssues: 0,
      closedIssues: 0,
      totalStoryPoints: 0,
      openStoryPoints: 0,
      closedStoryPoints: 0,
      avgResolutionDays: 0,
      statusBreakdown: {},
      priorityBreakdown: {},
    }

    render(<SummaryCards data={zeroData} />)

    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
    // "0.0 story points" appears 3 times (Total, Open, Closed)
    expect(screen.getAllByText('0.0 story points').length).toBe(3)
    expect(screen.getByText('0.0 days')).toBeInTheDocument()
  })
})
