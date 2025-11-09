import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusChart } from './StatusChart'
import { StatusBreakdown } from '@/types'

// Mock chart.js and react-chartjs-2
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  ArcElement: {},
  Tooltip: {},
  Legend: {},
}))

vi.mock('react-chartjs-2', () => ({
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart">
      <div data-testid="chart-labels">{JSON.stringify(data.labels)}</div>
      <div data-testid="chart-data">{JSON.stringify(data.datasets[0].data)}</div>
      <div data-testid="chart-colors">{JSON.stringify(data.datasets[0].backgroundColor)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}))

const mockStatusData: StatusBreakdown = {
  'To Do': 5,
  'In Progress': 8,
  'Code Review': 3,
  'Done': 9,
}

describe('StatusChart', () => {
  it('should render chart title', () => {
    render(<StatusChart data={mockStatusData} />)

    expect(screen.getByText('Status Distribution')).toBeInTheDocument()
  })

  it('should render Doughnut chart component', () => {
    render(<StatusChart data={mockStatusData} />)

    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument()
  })

  it('should pass correct labels to chart', () => {
    render(<StatusChart data={mockStatusData} />)

    const labels = screen.getByTestId('chart-labels')
    const labelData = JSON.parse(labels.textContent || '[]')

    expect(labelData).toEqual(['To Do', 'In Progress', 'Code Review', 'Done'])
  })

  it('should pass correct values to chart', () => {
    render(<StatusChart data={mockStatusData} />)

    const chartData = screen.getByTestId('chart-data')
    const values = JSON.parse(chartData.textContent || '[]')

    expect(values).toEqual([5, 8, 3, 9])
  })

  it('should apply correct background colors', () => {
    render(<StatusChart data={mockStatusData} />)

    const colors = screen.getByTestId('chart-colors')
    const colorData = JSON.parse(colors.textContent || '[]')

    expect(colorData).toEqual([
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
    ])
  })

  it('should set chart options correctly', () => {
    render(<StatusChart data={mockStatusData} />)

    const options = screen.getByTestId('chart-options')
    const optionsData = JSON.parse(options.textContent || '{}')

    expect(optionsData.responsive).toBe(true)
    expect(optionsData.maintainAspectRatio).toBe(true)
    expect(optionsData.plugins.legend.position).toBe('bottom')
  })

  it('should handle empty status data', () => {
    const emptyData: StatusBreakdown = {}

    render(<StatusChart data={emptyData} />)

    const labels = screen.getByTestId('chart-labels')
    const chartData = screen.getByTestId('chart-data')

    expect(JSON.parse(labels.textContent || '[]')).toEqual([])
    expect(JSON.parse(chartData.textContent || '[]')).toEqual([])
  })

  it('should apply correct styling to container', () => {
    const { container } = render(<StatusChart data={mockStatusData} />)

    const chartContainer = container.querySelector('.bg-card')
    expect(chartContainer).toBeInTheDocument()
    expect(chartContainer).toHaveClass('shadow-card')
    expect(chartContainer).toHaveClass('border')
    expect(chartContainer).toHaveClass('border-custom')
    expect(chartContainer).toHaveClass('rounded-lg')
  })

  it('should constrain chart height', () => {
    const { container } = render(<StatusChart data={mockStatusData} />)

    const chartWrapper = container.querySelector('.max-h-\\[300px\\]')
    expect(chartWrapper).toBeInTheDocument()
  })

  it('should handle single status entry', () => {
    const singleStatus: StatusBreakdown = {
      'In Progress': 10,
    }

    render(<StatusChart data={singleStatus} />)

    const labels = screen.getByTestId('chart-labels')
    const chartData = screen.getByTestId('chart-data')

    expect(JSON.parse(labels.textContent || '[]')).toEqual(['In Progress'])
    expect(JSON.parse(chartData.textContent || '[]')).toEqual([10])
  })
})
