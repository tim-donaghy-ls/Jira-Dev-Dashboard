'use client'

import { useState } from 'react'
import { JiraIssue } from '@/types'

interface StoryPointsWarningProps {
  issues: JiraIssue[]
  jiraBaseUrl: string
}

export function StoryPointsWarning({ issues, jiraBaseUrl }: StoryPointsWarningProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Find issues without story points
  const issuesWithoutPoints = issues.filter(issue =>
    !issue.storyPoints || issue.storyPoints === 0
  )

  if (issuesWithoutPoints.length === 0) {
    return null
  }

  const count = issuesWithoutPoints.length

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-5 rounded">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>{count}</strong> ticket{count !== 1 ? 's' : ''} {count !== 1 ? 'do' : 'does'} not have story points assigned.{' '}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="font-semibold underline hover:text-yellow-900 dark:hover:text-yellow-100 cursor-pointer"
            >
              {isExpanded ? 'Hide Tickets' : 'Update These Tickets'}
            </button>
            {' '}to ensure accuracy of reporting.
          </p>

          {isExpanded && (
            <div className="mt-3">
              <ul className="space-y-2">
                {issuesWithoutPoints.map(issue => (
                  <li key={issue.key} className="flex items-start gap-2 text-sm">
                    <span className="text-yellow-800 dark:text-yellow-200">•</span>
                    <div className="flex-1">
                      <a
                        href={`${jiraBaseUrl}/browse/${issue.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-yellow-900 dark:text-yellow-100 hover:underline cursor-pointer underline decoration-dotted hover:decoration-solid"
                      >
                        {issue.key}
                      </a>
                      <span className="ml-2 text-yellow-700 dark:text-yellow-300">{issue.summary}</span>
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
