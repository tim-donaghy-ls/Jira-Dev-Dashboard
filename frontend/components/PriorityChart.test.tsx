import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriorityChart } from './PriorityChart'
import { PriorityBreakdown } from '@/types'

// Mock chart.js and react-chartjs-2
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}))

vi.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-labels">{JSON.stringify(data.labels)}</div>
      <div data-testid="chart-data">{JSON.stringify(data.datasets[0].data)}</div>
      <div data-testid="chart-label">{data.datasets[0].label}</div>
      <div data-testid="chart-color">{data.datasets[0].backgroundColor}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}))

const mockPriorityData: PriorityBreakdown = {
  'High': 12,
  'Medium': 8,
  'Low': 5,
}

describe('PriorityChart', () => {
  it('should render chart title', () => {
    render(<PriorityChart data={mockPriorityData} />)

    expect(screen.getByText('Priority Breakdown')).toBeInTheDocument()
  })

  it('should render Bar chart component', () => {
    render(<PriorityChart data={mockPriorityData} />)

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('should pass correct labels to chart', () => {
    render(<PriorityChart data={mockPriorityData} />)

    const labels = screen.getByTestId('chart-labels')
    const labelData = JSON.parse(labels.textContent || '[]')

    expect(labelData).toEqual(['High', 'Medium', 'Low'])
  })

  it('should pass correct values to chart', () => {
    render(<PriorityChart data={mockPriorityData} />)

    const chartData = screen.getByTestId('chart-data')
    const values = JSON.parse(chartData.textContent || '[]')

    expect(values).toEqual([12, 8, 5])
  })

  it('should set dataset label to "Issues"', () => {
    render(<PriorityChart data={mockPriorityData} />)

    const label = screen.getByTestId('chart-label')
    expect(label.textContent).toBe('Issues')
  })

  it('should apply correct background color', () => {
    render(<PriorityChart data={mockPriorityData} />)

    const color = screen.getByTestId('chart-color')
    expect(color.textContent).toBe('#667eea')
  })

  it('should set chart options correctly', () => {
    render(<PriorityChart data={mockPriorityData} />)

    const options = screen.getByTestId('chart-options')
    const optionsData = JSON.parse(options.textContent || '{}')

    expect(optionsData.responsive).toBe(true)
    expect(optionsData.maintainAspectRatio).toBe(true)
    expect(optionsData.plugins.legend.display).toBe(false)
    expect(optionsData.scales.y.beginAtZero).toBe(true)
    expect(optionsData.scales.y.ticks.stepSize).toBe(1)
  })

  it('should handle empty priority data', () => {
    const emptyData: PriorityBreakdown = {}

    render(<PriorityChart data={emptyData} />)

    const labels = screen.getByTestId('chart-labels')
    const chartData = screen.getByTestId('chart-data')

    expect(JSON.parse(labels.textContent || '[]')).toEqual([])
    expect(JSON.parse(chartData.textContent || '[]')).toEqual([])
  })

  it('should apply correct styling to container', () => {
    const { container } = render(<PriorityChart data={mockPriorityData} />)

    const chartContainer = container.querySelector('.bg-card')
    expect(chartContainer).toBeInTheDocument()
    expect(chartContainer).toHaveClass('shadow-card')
    expect(chartContainer).toHaveClass('border')
    expect(chartContainer).toHaveClass('border-custom')
    expect(chartContainer).toHaveClass('rounded-lg')
  })

  it('should constrain chart height', () => {
    const { container } = render(<PriorityChart data={mockPriorityData} />)

    const chartWrapper = container.querySelector('.max-h-\\[300px\\]')
    expect(chartWrapper).toBeInTheDocument()
  })

  it('should handle single priority entry', () => {
    const singlePriority: PriorityBreakdown = {
      'Critical': 3,
    }

    render(<PriorityChart data={singlePriority} />)

    const labels = screen.getByTestId('chart-labels')
    const chartData = screen.getByTestId('chart-data')

    expect(JSON.parse(labels.textContent || '[]')).toEqual(['Critical'])
    expect(JSON.parse(chartData.textContent || '[]')).toEqual([3])
  })

  it('should handle various priority levels', () => {
    const variousPriorities: PriorityBreakdown = {
      'Critical': 2,
      'High': 5,
      'Medium': 10,
      'Low': 8,
      'Trivial': 3,
    }

    render(<PriorityChart data={variousPriorities} />)

    const labels = screen.getByTestId('chart-labels')
    const chartData = screen.getByTestId('chart-data')

    expect(JSON.parse(labels.textContent || '[]')).toEqual([
      'Critical',
      'High',
      'Medium',
      'Low',
      'Trivial',
    ])
    expect(JSON.parse(chartData.textContent || '[]')).toEqual([2, 5, 10, 8, 3])
  })
})
