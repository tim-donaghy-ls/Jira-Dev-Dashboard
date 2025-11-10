'use client'

import { useState } from 'react'
import { JiraIssue, StatusHistory, AhaVerification } from '@/types'
import { fetchIssueDetails } from '@/lib/api'
import AhaVerificationBadge from './AhaVerificationBadge'

interface IssueCardProps {
  issue: JiraIssue
  jiraBaseUrl: string
  instance: string
  ahaVerification?: AhaVerification
}

export function IssueCard({ issue, jiraBaseUrl, instance, ahaVerification }: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([])
  const [metrics, setMetrics] = useState<{ inProgressToQADays: number; developmentTimeDays: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const getStatusClass = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('open') || statusLower.includes('to do')) {
      return 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
    } else if (statusLower.includes('progress') || statusLower.includes('review')) {
      return 'bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200'
    } else if (statusLower.includes('done') || statusLower.includes('closed') || statusLower.includes('resolved')) {
      return 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200'
    }
    return 'bg-gray-50 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid Date'
    // Check if date is the zero value from Go (year 1 or 0)
    if (date.getFullYear() < 1900) return 'N/A'
    // Always format as mm/dd/yyyy
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}/${day}/${year}`
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}/${day}/${year} ${hours}:${minutes}`
  }

  const handleClick = async (e: React.MouseEvent) => {
    // Don't toggle if clicking on the JIRA link
    if ((e.target as HTMLElement).tagName === 'A' || (e.target as HTMLElement).closest('a')) {
      return
    }

    if (!isExpanded && statusHistory.length === 0) {
      setLoading(true)
      try {
        const data = await fetchIssueDetails(instance, issue.key)
        setStatusHistory(data.statusHistory)
        setMetrics({
          inProgressToQADays: data.inProgressToQADays,
          developmentTimeDays: data.developmentTimeDays
        })
      } catch (error) {
        console.error('Error fetching issue details:', error)
      } finally {
        setLoading(false)
      }
    }

    setIsExpanded(!isExpanded)
  }

  return (
    <div
      onClick={handleClick}
      className="bg-card shadow-card border border-custom rounded-lg p-4 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-px cursor-pointer"
    >
      <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
        <a
          href={`${jiraBaseUrl}/browse/${issue.key}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-sm link-color hover:underline cursor-pointer underline decoration-dotted hover:decoration-solid"
          onClick={(e) => e.stopPropagation()}
        >
          {issue.key}
        </a>
        {issue.storyPoints && issue.storyPoints > 0 && (
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-orange-600 text-white border border-orange-700 shadow-sm">
            {issue.storyPoints} SP
          </span>
        )}
        <span className={`px-3 py-1 rounded-xl text-xs font-semibold uppercase tracking-wide ${getStatusClass(issue.status)}`}>
          {issue.status}
        </span>
        {issue.developmentTimeDays && issue.developmentTimeDays > 0 && (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
            ⏱️ To Do → QA: {issue.developmentTimeDays.toFixed(1)} days
          </span>
        )}
        {/* Aha Verification Badge */}
        <AhaVerificationBadge
          jiraKey={issue.key}
          verification={ahaVerification}
        />
        <span className="ml-auto text-xs text-secondary">
          {isExpanded ? 'Click to collapse' : 'Click to expand'}
        </span>
      </div>

      <div className="text-[15px] font-medium text-primary mb-2.5 leading-snug">
        {issue.summary}
      </div>

      <div className="flex flex-wrap gap-4 text-[13px] text-secondary">
        <span>📋 {issue.issueType}</span>
        <span>🎯 {issue.priority}</span>
        <span>👤 {issue.assignee || 'Unassigned'}</span>
        <span>📅 Updated: {formatDate(issue.updated)}</span>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-custom">
          {loading ? (
            <div className="text-center text-secondary py-4">Loading timeline...</div>
          ) : (
            <>
              {/* Description */}
              <div className="mb-4">
                <h4 className="text-sm font-bold text-primary mb-2">Description</h4>
                <p className="text-sm text-secondary whitespace-pre-wrap">
                  {issue.description || 'No description available'}
                </p>
              </div>

              {/* Status Timeline */}
              {statusHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-primary mb-2">Status Timeline</h4>

                  {/* Metrics */}
                  {metrics && (metrics.developmentTimeDays > 0 || metrics.inProgressToQADays > 0) && (
                    <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded border border-custom">
                      {metrics.developmentTimeDays > 0 && (
                        <div className="flex justify-between items-center mb-2 last:mb-0">
                          <span className="text-xs text-secondary">Development Time (To Do → Code Review):</span>
                          <span className="text-xs font-semibold text-primary">{metrics.developmentTimeDays.toFixed(1)} days</span>
                        </div>
                      )}
                      {metrics.inProgressToQADays > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-secondary">In Progress → QA Review:</span>
                          <span className="text-xs font-semibold text-primary">{metrics.inProgressToQADays.toFixed(1)} days</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="space-y-2">
                    {statusHistory.map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                        <div className="flex-1 pb-2">
                          <div className="text-sm text-primary">
                            {item.fromStatus && (
                              <span className="text-secondary">{item.fromStatus} → </span>
                            )}
                            <span className="font-semibold">{item.status}</span>
                          </div>
                          <div className="text-xs text-secondary mt-0.5">
                            {formatTimestamp(item.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
