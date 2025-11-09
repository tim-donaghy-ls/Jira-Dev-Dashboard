'use client'

import { useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { AssigneeStats } from '@/types'
import { ChartModal } from './ChartModal'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface DeveloperStoryPointsChartProps {
  data: AssigneeStats[]
}

export function DeveloperStoryPointsChart({ data }: DeveloperStoryPointsChartProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  // Sort developers by total story points (descending)
  const sortedData = [...data].sort((a, b) => b.totalStoryPoints - a.totalStoryPoints)

  const chartData = {
    labels: sortedData.map(dev => dev.name),
    datasets: [
      {
        label: 'Story Points',
        data: sortedData.map(dev => dev.totalStoryPoints),
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#36A2EB',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
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
            return `Story Points: ${context.parsed.y}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 5,
        },
      },
    },
  }

  return (
    <>
      <div className="bg-card shadow-card border border-custom rounded-lg p-4 transition-all duration-200 hover:shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-base font-semibold text-primary">
            Developer Story Points
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
          <Line data={chartData} options={options} />
        </div>
      </div>

      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Developer Story Points"
      >
        <Line data={chartData} options={options} />
      </ChartModal>
    </>
  )
}
