'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { PriorityBreakdown } from '@/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface PriorityChartProps {
  data: PriorityBreakdown
}

export function PriorityChart({ data }: PriorityChartProps) {
  const labels = Object.keys(data)
  const values = Object.values(data)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Issues',
        data: values,
        backgroundColor: '#667eea',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  }

  return (
    <div className="bg-card shadow-card border border-custom rounded-lg p-4">
      <h3 className="text-base font-semibold text-primary mb-4">
        Priority Breakdown
      </h3>
      <div className="max-h-[300px]">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  )
}
