'use client'

import { useState, useEffect } from 'react'
import { JiraIssue } from '@/types'

interface AhaWarningProps {
  issues: JiraIssue[]
  jiraBaseUrl: string
  apiUrl: string
}

interface AhaVerification {
  jiraKey: string
  existsInAha: boolean
  ahaReference?: string
  ahaUrl?: string
  ahaStatus?: string
  error?: string
}

export function AhaWarning({ issues, jiraBaseUrl, apiUrl }: AhaWarningProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [verifications, setVerifications] = useState<AhaVerification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVerifications() {
      if (issues.length === 0) {
        setLoading(false)
        return
      }

      try {
        const jiraKeys = issues.map(issue => issue.key)
        const response = await fetch(`${apiUrl}/api/aha/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jiraKeys }),
        })

        if (response.ok) {
          const data = await response.json()
          setVerifications(data)
        }
      } catch (error) {
        console.error('Error fetching Aha verifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVerifications()
  }, [issues, apiUrl])

  if (loading) {
    return null
  }

  // Find issues that are NOT in Aha
  const issuesNotInAha = verifications.filter(v => !v.existsInAha)

  if (issuesNotInAha.length === 0) {
    return null
  }

  const count = issuesNotInAha.length

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 p-4 mb-5 rounded">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            <strong>{count}</strong> ticket{count !== 1 ? 's' : ''} {count !== 1 ? 'are' : 'is'} not in Aha.{' '}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="font-semibold underline hover:text-orange-900 dark:hover:text-orange-100 cursor-pointer"
            >
              {isExpanded ? 'Hide Tickets' : 'View Tickets'}
            </button>
            {' '}to ensure proper feature tracking.
          </p>

          {isExpanded && (
            <div className="mt-3">
              <ul className="space-y-2">
                {issuesNotInAha.map(verification => {
                  const issue = issues.find(i => i.key === verification.jiraKey)
                  if (!issue) return null

                  return (
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
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
