'use client'

import React, { useState, useEffect } from 'react'
import { AssigneeStats, JiraIssue } from '@/types'

interface DeveloperWorkloadProps {
  data: AssigneeStats[]
  allIssues: JiraIssue[]
  jiraBaseUrl: string
}

export function DeveloperWorkload({ data, allIssues, jiraBaseUrl }: DeveloperWorkloadProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jira_dashboard_workload_collapsed')
      return saved === 'true'
    }
    return false
  })
  const [expandedDeveloper, setExpandedDeveloper] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('jira_dashboard_workload_collapsed', isCollapsed.toString())
  }, [isCollapsed])

  // Define the specific column order
  const orderedStatuses = [
    'To Do',
    'In Progress',
    'Code Review',
    'QA Review',
    'Schedule Release',
    'Production Release'
  ]

  // Display names for columns
  const displayNames: Record<string, string> = {
    'To Do': 'To Do',
    'In Progress': 'In Progress',
    'Code Review': 'Code Review',
    'QA Review': 'QA Review',
    'Schedule Release': 'Schedule Release',
    'Production Release': 'Production Release'
  }

  // Calculate totals for each status
  const statusTotals = orderedStatuses.reduce((acc, status) => {
    acc[status] = data.reduce((sum, dev) => {
      // Combine "To Do" and "ToDo" counts
      if (status === 'To Do') {
        return sum + (dev.statusBreakdown?.['To Do'] || 0) + (dev.statusBreakdown?.['ToDo'] || 0)
      }
      return sum + (dev.statusBreakdown?.[status] || 0)
    }, 0)
    return acc
  }, {} as Record<string, number>)

  const grandTotal = orderedStatuses.reduce((sum, status) => sum + statusTotals[status], 0)
  const totalStoryPoints = data.reduce((sum, dev) => sum + (dev.totalStoryPoints || 0), 0)

  // Find failed tickets for a developer
  const findFailedTickets = (developerName: string) => {
    const failedStatuses = ['Failed', 'failed', 'FAILED', 'QA Failed', 'Failed QA']
    const failedTickets: Array<{ key: string; summary: string; failures: number; status: string }> = []

    allIssues.forEach(issue => {
      const assignee = issue.assignee || 'Unassigned'
      if (assignee !== developerName) return

      // Check if this issue has status history
      if (!issue.statusHistory || issue.statusHistory.length === 0) return

      // Count how many times the ticket entered a "Failed" status
      let failureCount = 0

      for (let i = 0; i < issue.statusHistory.length; i++) {
        const currentStatus = issue.statusHistory[i].status

        // Check if this status is a failed status
        if (failedStatuses.includes(currentStatus)) {
          failureCount++
        }
      }

      // Only include tickets that actually went through a "Failed" status
      if (failureCount > 0) {
        failedTickets.push({
          key: issue.key,
          summary: issue.summary,
          failures: failureCount,
          status: issue.status
        })
      }
    })

    return failedTickets
  }

  const handleRowClick = (developerName: string) => {
    if (expandedDeveloper === developerName) {
      setExpandedDeveloper(null)
    } else {
      setExpandedDeveloper(developerName)
    }
  }

  return (
    <div className="bg-container shadow-card border border-custom rounded-lg p-5 mb-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-primary">Developer Workload by Status</h3>
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
          <div className="text-sm text-secondary italic mb-4">
            Click on a row to display assisted tickets.
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 border-b-2 border-custom">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-primary uppercase text-xs tracking-wide">
                    Developer
                  </th>
                  {orderedStatuses.map(status => (
                    <th key={status} className="px-4 py-3 text-center font-semibold text-primary uppercase text-xs tracking-wide">
                      {displayNames[status] || status}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold text-primary uppercase text-xs tracking-wide">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-primary uppercase text-xs tracking-wide">
                    Story Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((dev) => {
                  const failedTickets = findFailedTickets(dev.name)
                  const isExpanded = expandedDeveloper === dev.name
                  let rowTotal = 0

                  return (
                    <React.Fragment key={dev.name}>
                      <tr
                        onClick={() => handleRowClick(dev.name)}
                        className={`border-b border-custom cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                          isExpanded ? 'bg-primary/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-primary font-medium">{dev.name}</td>
                        {orderedStatuses.map(status => {
                          // Combine "To Do" and "ToDo" counts
                          let count = 0
                          if (status === 'To Do') {
                            count = (dev.statusBreakdown?.['To Do'] || 0) + (dev.statusBreakdown?.['ToDo'] || 0)
                          } else {
                            count = dev.statusBreakdown?.[status] || 0
                          }
                          rowTotal += count

                          return (
                            <td
                              key={status}
                              className="px-4 py-3 text-center"
                            >
                              <span className={count > 0 ? 'text-primary' : 'text-secondary'}>
                                {count || '-'}
                              </span>
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-center text-primary font-medium">
                          {rowTotal}
                        </td>
                        <td className="px-4 py-3 text-center text-primary">
                          {dev.totalStoryPoints > 0 ? dev.totalStoryPoints.toFixed(0) : '-'}
                        </td>
                      </tr>

                      {/* Expanded row for failed tickets */}
                      {isExpanded && (
                        <tr className="border-b border-custom bg-gray-50 dark:bg-gray-800/30">
                          <td colSpan={orderedStatuses.length + 3} className="px-4 py-4">
                            {failedTickets.length === 0 ? (
                              <p className="text-green-600 dark:text-green-400 font-semibold">
                                ✓ No failed tickets found for this developer
                              </p>
                            ) : (
                              <div>
                                <h4 className="text-base font-bold text-primary mb-3">
                                  Failed Tickets ({failedTickets.length})
                                </h4>
                                <div className="space-y-2">
                                  {failedTickets.map(ticket => (
                                    <div
                                      key={ticket.key}
                                      className="p-3 bg-white dark:bg-gray-900 rounded border border-custom flex items-start justify-between"
                                    >
                                      <div className="flex-1">
                                        <a
                                          href={`${jiraBaseUrl}/browse/${ticket.key}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-semibold link-color hover:underline cursor-pointer underline decoration-dotted hover:decoration-solid"
                                        >
                                          {ticket.key}
                                        </a>
                                        <span className="ml-3 text-sm text-secondary">{ticket.summary}</span>
                                      </div>
                                      <span className="ml-4 text-xs text-red-600 dark:text-red-400 font-medium">
                                        {ticket.failures} failure(s)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-800 border-t-2 border-custom font-semibold">
                <tr>
                  <td className="px-4 py-3 text-primary">Total</td>
                  {orderedStatuses.map(status => (
                    <td key={status} className="px-4 py-3 text-center text-primary">
                      {statusTotals[status]}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-primary">
                    {grandTotal}
                  </td>
                  <td className="px-4 py-3 text-center text-primary">
                    {totalStoryPoints.toFixed(0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
