'use client'

import { useState, useEffect } from 'react'
import { StatusChart } from './StatusChart'
import { DeveloperStoryPointsChart } from './DeveloperStoryPointsChart'
import { DeveloperDevTimeChart } from './DeveloperDevTimeChart'
import { DeveloperWorkloadChart } from './DeveloperWorkloadChart'
import { StatusBreakdown, AssigneeStats, JiraIssue } from '@/types'

interface ChartsOverviewProps {
  statusData: StatusBreakdown
  assigneeStats: AssigneeStats[]
  allIssues: JiraIssue[]
}

export function ChartsOverview({ statusData, assigneeStats, allIssues }: ChartsOverviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jira_dashboard_charts_collapsed')
      return saved === 'true'
    }
    return false
  })

  useEffect(() => {
    localStorage.setItem('jira_dashboard_charts_collapsed', isCollapsed.toString())
  }, [isCollapsed])

  return (
    <div className="bg-container shadow-card border border-custom rounded-lg p-5 mb-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-primary">Charts Overview</h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 flex items-center justify-center rounded text-2xl font-bold text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title="Collapse/Expand"
        >
          {isCollapsed ? '+' : '−'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-4">
          <StatusChart data={statusData} />
          <DeveloperStoryPointsChart data={assigneeStats} />
          <DeveloperDevTimeChart data={assigneeStats} />
          <DeveloperWorkloadChart data={assigneeStats} allIssues={allIssues} />
        </div>
      )}
    </div>
  )
}
