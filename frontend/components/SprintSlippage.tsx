'use client'

import React, { useState, useEffect } from 'react'
import { JiraIssue, SprintInfo } from '@/types'

interface SprintSlippageProps {
  allIssues: JiraIssue[]
  jiraBaseUrl: string
  currentSprintName?: string
  sprintInfo?: SprintInfo
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

export function SprintSlippage({ allIssues, jiraBaseUrl, currentSprintName, sprintInfo }: SprintSlippageProps) {
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

  // Calculate days remaining until end of sprint
  const calculateDaysRemaining = (): { days: number; isUrgent: boolean } | null => {
    if (!sprintInfo?.endDate) {
      return null
    }

    const endDate = new Date(sprintInfo.endDate)
    const now = new Date()

    // Reset time to start of day for accurate day calculation
    endDate.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)

    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return {
      days: diffDays,
      isUrgent: diffDays <= 3 && diffDays >= 0
    }
  }

  const daysRemaining = calculateDaysRemaining()

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
        <div className="flex-1">
          <h3 className="text-xl font-bold text-primary">Sprint Slippage</h3>
          <p className="text-sm text-secondary mt-1">
            Tickets in progress but not completed ({currentSprintName || 'Current Sprint'})
          </p>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 flex items-center justify-center rounded text-2xl font-bold text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors ml-4"
          title="Collapse/Expand"
        >
          {isCollapsed ? '+' : '−'}
        </button>
      </div>

      {/* Days Remaining Warning */}
      {daysRemaining !== null && daysRemaining.isUrgent && daysRemaining.days >= 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-4 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>ONLY {daysRemaining.days} day{daysRemaining.days !== 1 ? 's' : ''} remaining</strong> in the current sprint. Review slipped tickets and prioritize completion.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Non-urgent days remaining info */}
      {daysRemaining !== null && !daysRemaining.isUrgent && daysRemaining.days >= 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3 mb-4 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>{daysRemaining.days} day{daysRemaining.days !== 1 ? 's' : ''} remaining</strong> until the end of the current sprint.
              </p>
            </div>
          </div>
        </div>
      )}

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
