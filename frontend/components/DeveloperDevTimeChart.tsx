'use client'

import { useState } from 'react'
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
import { AssigneeStats } from '@/types'
import { ChartModal } from './ChartModal'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface DeveloperDevTimeChartProps {
  data: AssigneeStats[]
}

export function DeveloperDevTimeChart({ data }: DeveloperDevTimeChartProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  // Filter out developers with no development time and sort by avg dev time
  const filteredData = data.filter(dev => dev.avgDevelopmentTimeDays > 0)
  const sortedData = [...filteredData].sort((a, b) => b.avgDevelopmentTimeDays - a.avgDevelopmentTimeDays)

  const chartData = {
    labels: sortedData.map(dev => dev.name),
    datasets: [
      {
        label: 'Avg Development Time (days)',
        data: sortedData.map(dev => dev.avgDevelopmentTimeDays),
        backgroundColor: '#4BC0C0',
        borderColor: '#4BC0C0',
        borderWidth: 1,
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
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Avg Dev Time: ${context.parsed.y.toFixed(1)} days`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value + ' days'
          }
        },
      },
    },
  }

  return (
    <>
      <div className="bg-card shadow-card border border-custom rounded-lg p-4 transition-all duration-200 hover:shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-base font-semibold text-primary">
            Average Development Time
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
          <Bar data={chartData} options={options} />
        </div>
      </div>

      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Average Development Time"
      >
        <Bar data={chartData} options={options} />
      </ChartModal>
    </>
  )
}
