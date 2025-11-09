'use client'

import { useState } from 'react'
import { JiraIssue } from '@/types'

interface UnassignedTicketsWarningProps {
  issues: JiraIssue[]
  jiraBaseUrl: string
}

export function UnassignedTicketsWarning({ issues, jiraBaseUrl }: UnassignedTicketsWarningProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Find issues without assignees
  const unassignedIssues = issues.filter(issue =>
    !issue.assignee || issue.assignee.trim() === ''
  )

  if (unassignedIssues.length === 0) {
    return null
  }

  const count = unassignedIssues.length

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 p-4 mb-5 rounded">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            <strong>{count}</strong> ticket{count !== 1 ? 's' : ''} {count !== 1 ? 'are' : 'is'} not assigned to anyone.{' '}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="font-semibold underline hover:text-orange-900 dark:hover:text-orange-100 cursor-pointer"
            >
              {isExpanded ? 'Hide Tickets' : 'Assign These Tickets'}
            </button>
            {' '}to ensure accurate team workload reporting.
          </p>

          {isExpanded && (
            <div className="mt-3">
              <ul className="space-y-2">
                {unassignedIssues.map(issue => (
                  <li key={issue.key} className="flex items-start gap-2 text-sm">
                    <span className="text-orange-800 dark:text-orange-200">•</span>
                    <div className="flex-1">
                      <a
                        href={`${jiraBaseUrl}/browse/${issue.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-orange-900 dark:text-orange-100 hover:underline cursor-pointer underline decoration-dotted hover:decoration-solid"
                      >
                        {issue.key}
                      </a>
                      <span className="ml-2 text-orange-700 dark:text-orange-300">{issue.summary}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
