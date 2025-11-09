'use client'

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { StatusBreakdown } from '@/types'

ChartJS.register(ArcElement, Tooltip, Legend)

interface StatusChartProps {
  data: StatusBreakdown
}

export function StatusChart({ data }: StatusChartProps) {
  const labels = Object.keys(data)
  const values = Object.values(data)

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  }

  return (
    <div className="bg-card shadow-card border border-custom rounded-lg p-4">
      <h3 className="text-base font-semibold text-primary mb-4">
        Status Distribution
      </h3>
      <div className="max-h-[300px]">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  )
}
