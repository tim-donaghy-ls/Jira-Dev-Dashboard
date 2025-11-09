'use client'

import React, { useState, useEffect } from 'react'
import { JiraIssue } from '@/types'

interface SprintSlippageProps {
  allIssues: JiraIssue[]
  jiraBaseUrl: string
  currentSprintName?: string
}

interface SlippedTicket {
  key: string
  summary: string
  assignee: string
  storyPoints: number
  status: string
  priority: string
  created: string
}

interface SprintSlippageStats {
  committedPoints: number
  completedPoints: number
  slippedPoints: number
  slippagePercentage: number
  slippedTickets: SlippedTicket[]
}

export function SprintSlippage({ allIssues, jiraBaseUrl, currentSprintName }: SprintSlippageProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jira_dashboard_slippage_collapsed')
      return saved === 'true'
    }
    return false
  })

  useEffect(() => {
    localStorage.setItem('jira_dashboard_slippage_collapsed', isCollapsed.toString())
  }, [isCollapsed])

  // Calculate sprint slippage based on committed vs completed story points
  // Sprint Slippage % = (Story Points Not Completed / Story Points Committed) × 100
  // Only includes tickets that were "In Progress" during the sprint but not completed
  const calculateSprintSlippage = (): SprintSlippageStats => {
    // Done/Completed statuses (including scheduled/production release as complete)
    const completedStatuses = ['Done', 'Closed', 'Resolved', 'Complete', 'Completed', 'Schedule Release', 'Scheduled Release', 'Production Release', 'Prod Release', 'Release']
    // In Progress statuses that indicate work was started
    const inProgressStatuses = ['In Progress', 'Code Review', 'QA Review', 'Testing', 'Review']

    let committedPoints = 0
    let completedPoints = 0
    const slippedTickets: SlippedTicket[] = []

    allIssues.forEach(issue => {
      const points = issue.storyPoints || 0

      // Check if ticket was ever in progress (work was started)
      const wasInProgress = issue.statusHistory?.some(history =>
        inProgressStatuses.some(status =>
          history.status.toLowerCase().includes(status.toLowerCase())
        )
      ) || inProgressStatuses.some(status =>
        issue.status.toLowerCase().includes(status.toLowerCase())
      )

      // Skip tickets that were never worked on
      if (!wasInProgress) {
        return
      }

      // This ticket was committed (work was started on it)
      committedPoints += points

      // Check if this issue is completed
      const isCompleted = completedStatuses.some(status =>
        issue.status.toLowerCase() === status.toLowerCase()
      )

      if (isCompleted) {
        completedPoints += points
      } else {
        // This ticket was in progress but not completed (slipped)
        slippedTickets.push({
          key: issue.key,
          summary: issue.summary,
          assignee: issue.assignee || 'Unassigned',
          storyPoints: points,
          status: issue.status,
          priority: issue.priority,
          created: issue.created
        })
      }
    })

    const slippedPoints = committedPoints - completedPoints
    const slippagePercentage = committedPoints > 0
      ? (slippedPoints / committedPoints) * 100
      : 0

    // Sort slipped tickets by story points (descending), then by priority
    const sortedSlippedTickets = slippedTickets.sort((a, b) => {
      if (b.storyPoints !== a.storyPoints) {
        return b.storyPoints - a.storyPoints
      }
      const priorityOrder: Record<string, number> = {
        'Highest': 5,
        'High': 4,
        'Medium': 3,
        'Low': 2,
        'Lowest': 1
      }
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
    })

    return {
      committedPoints,
      completedPoints,
      slippedPoints,
      slippagePercentage,
      slippedTickets: sortedSlippedTickets
    }
  }

  const sprintStats = calculateSprintSlippage()
  const { committedPoints, completedPoints, slippedPoints, slippagePercentage, slippedTickets } = sprintStats

  // Group by assignee
  const ticketsByAssignee = slippedTickets.reduce((acc, ticket) => {
    if (!acc[ticket.assignee]) {
      acc[ticket.assignee] = []
    }
    acc[ticket.assignee].push(ticket)
    return acc
  }, {} as Record<string, SlippedTicket[]>)

  const assignees = Object.keys(ticketsByAssignee).sort((a, b) =>
    ticketsByAssignee[b].length - ticketsByAssignee[a].length
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown'
    }

    const now = new Date()
    const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    // If calculation results in unreasonable value, return unknown
    if (daysAgo < 0 || daysAgo > 3650) { // More than 10 years
      return 'Unknown'
    }

    return `${daysAgo} days ago`
  }

  return (
    <div className="bg-container shadow-card border border-custom rounded-lg p-5 mb-5">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-primary">Sprint Slippage</h3>
          <p className="text-sm text-secondary mt-1">
            Tickets in progress but not completed ({currentSprintName || 'Current Sprint'})
          </p>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 flex items-center justify-center rounded text-2xl font-bold text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title="Collapse/Expand"
        >
          {isCollapsed ? '+' : '−'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {committedPoints === 0 ? (
            <div className="text-center py-8 text-secondary">
              <p className="text-lg">No sprint data available</p>
              <p className="text-sm mt-2">No tickets with story points found in the current sprint.</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card border border-custom rounded-lg p-4">
                  <div className="text-sm text-secondary">Committed Points</div>
                  <div className="text-3xl font-bold text-primary mt-1">{committedPoints.toFixed(0)}</div>
                </div>
                <div className="bg-card border border-custom rounded-lg p-4">
                  <div className="text-sm text-secondary">Completed Points</div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{completedPoints.toFixed(0)}</div>
                </div>
                <div className="bg-card border border-custom rounded-lg p-4">
                  <div className="text-sm text-secondary">Slipped Points</div>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{slippedPoints.toFixed(0)}</div>
                </div>
                <div className="bg-card border border-custom rounded-lg p-4">
                  <div className="text-sm text-secondary">Slippage %</div>
                  <div className={`text-3xl font-bold mt-1 ${slippagePercentage > 20 ? 'text-red-600 dark:text-red-400' : slippagePercentage > 10 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                    {slippagePercentage.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Tickets by Assignee */}
              <div className="space-y-4">
                {assignees.map(assignee => {
                  const tickets = ticketsByAssignee[assignee]
                  const points = tickets.reduce((sum, t) => sum + t.storyPoints, 0)

                  return (
                    <div key={assignee} className="bg-card border border-custom rounded-lg">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-custom">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-primary">{assignee}</h4>
                          <div className="flex gap-4 text-sm text-secondary">
                            <span>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
                            <span>{points.toFixed(0)} points</span>
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-custom">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">Ticket</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">Summary</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">Priority</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">Points</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">Age</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tickets.map(ticket => (
                              <tr key={ticket.key} className="border-b border-custom hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                <td className="px-4 py-3">
                                  <a
                                    href={`${jiraBaseUrl}/browse/${ticket.key}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                  >
                                    {ticket.key}
                                  </a>
                                </td>
                                <td className="px-4 py-3 text-primary">{ticket.summary}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                    {ticket.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-primary">{ticket.priority}</td>
                                <td className="px-4 py-3 text-primary">{ticket.storyPoints || '-'}</td>
                                <td className="px-4 py-3 text-secondary">{formatDate(ticket.created)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
