'use client'

import { useState } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { StatusBreakdown } from '@/types'
import { ChartModal } from './ChartModal'

ChartJS.register(ArcElement, Tooltip, Legend)

interface StatusChartProps {
  data: StatusBreakdown
}

export function StatusChart({ data }: StatusChartProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

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
    <>
      <div className="bg-card shadow-card border border-custom rounded-lg p-4 transition-all duration-200 hover:shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-base font-semibold text-primary">
            Status Distribution
          </h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-6 h-6 flex items-center justify-center rounded text-sm text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Expand Chart"
          >
            ⛶
          </button>
        </div>
        <div className="max-h-[300px]">
          <Doughnut data={chartData} options={options} />
        </div>
      </div>

      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Status Distribution"
      >
        <Doughnut data={chartData} options={options} />
      </ChartModal>
    </>
  )
}
