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
import { AssigneeStats, JiraIssue } from '@/types'
import { ChartModal } from './ChartModal'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface DeveloperWorkloadChartProps {
  data: AssigneeStats[]
  allIssues: JiraIssue[]
}

export function DeveloperWorkloadChart({ data, allIssues }: DeveloperWorkloadChartProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  // Calculate failure status for each developer's tickets
  const calculateTicketFailures = (developerName: string) => {
    const failedStatuses = ['Failed', 'failed', 'FAILED', 'QA Failed', 'Failed QA']
    let hadFailures = 0
    let noFailures = 0

    allIssues.forEach(issue => {
      const assignee = issue.assignee || 'Unassigned'
      if (assignee !== developerName) return

      // Check if this issue has status history
      if (!issue.statusHistory || issue.statusHistory.length === 0) {
        // No status history means it never failed
        noFailures++
        return
      }

      // Check if the ticket ever entered a "Failed" status
      const hasFailed = issue.statusHistory.some(history =>
        failedStatuses.includes(history.status)
      )

      if (hasFailed) {
        hadFailures++
      } else {
        noFailures++
      }
    })

    return { hadFailures, noFailures }
  }

  // Prepare data for each developer
  const chartData = data.map(dev => {
    const { hadFailures, noFailures } = calculateTicketFailures(dev.name)

    return {
      name: dev.name,
      hadFailures,
      noFailures
    }
  })

  // Sort by total tickets (descending)
  const sortedData = [...chartData].sort((a, b) =>
    (b.hadFailures + b.noFailures) - (a.hadFailures + a.noFailures)
  )

  const chartConfig = {
    labels: sortedData.map(dev => dev.name),
    datasets: [
      {
        label: 'No Failures',
        data: sortedData.map(dev => dev.noFailures),
        backgroundColor: '#4BC0C0',
        borderColor: '#4BC0C0',
        borderWidth: 1,
      },
      {
        label: 'Had Failures',
        data: sortedData.map(dev => dev.hadFailures),
        backgroundColor: '#FF6384',
        borderColor: '#FF6384',
        borderWidth: 1,
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
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          footer: function(items: any) {
            const total = items.reduce((sum: number, item: any) => sum + item.parsed.y, 0)
            return `Total: ${total}`
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  }

  return (
    <>
      <div className="bg-card shadow-card border border-custom rounded-lg p-4 transition-all duration-200 hover:shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-base font-semibold text-primary">
            Ticket Failure Analysis
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
          <Bar data={chartConfig} options={options} />
        </div>
      </div>

      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ticket Failure Analysis"
      >
        <Bar data={chartConfig} options={options} />
      </ChartModal>
    </>
  )
}
