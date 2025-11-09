'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AssigneeStats, JiraIssue } from '@/types'
import * as XLSX from 'xlsx'

interface TeamPerformanceTableProps {
  data: AssigneeStats[]
  allIssues: JiraIssue[]
}

export function TeamPerformanceTable({ data, allIssues }: TeamPerformanceTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jira_dashboard_team_collapsed')
      return saved === 'true'
    }
    return false
  })
  const [expandedDevelopers, setExpandedDevelopers] = useState<Set<string>>(new Set())
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [tooltipData, setTooltipData] = useState<{
    percentage: number
    breakdown: string[]
    x: number
    y: number
  } | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    localStorage.setItem('jira_dashboard_team_collapsed', isCollapsed.toString())
  }, [isCollapsed])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isMenuOpen])


  // Calculate totals
  const totals = data.reduce(
    (acc, stats) => ({
      totalIssues: acc.totalIssues + stats.totalIssues,
      openIssues: acc.openIssues + stats.openIssues,
      closedIssues: acc.closedIssues + stats.closedIssues,
      totalStoryPoints: acc.totalStoryPoints + stats.totalStoryPoints,
      devTimeCount: acc.devTimeCount + (stats.avgDevelopmentTimeDays > 0 ? 1 : 0),
      totalDevTime: acc.totalDevTime + (stats.avgDevelopmentTimeDays > 0 ? stats.avgDevelopmentTimeDays : 0),
      qaTimeCount: acc.qaTimeCount + (stats.avgInProgressToQADays > 0 ? 1 : 0),
      totalQATime: acc.totalQATime + (stats.avgInProgressToQADays > 0 ? stats.avgInProgressToQADays : 0),
    }),
    { totalIssues: 0, openIssues: 0, closedIssues: 0, totalStoryPoints: 0, devTimeCount: 0, totalDevTime: 0, qaTimeCount: 0, totalQATime: 0 }
  )

  const avgDevTime = totals.devTimeCount > 0 ? (totals.totalDevTime / totals.devTimeCount).toFixed(1) : '-'
  const avgQATime = totals.qaTimeCount > 0 ? (totals.totalQATime / totals.qaTimeCount).toFixed(1) : '-'

  // Calculate metrics for a specific developer
  const calculateDeveloperMetrics = (developerName: string) => {
    let storyPoints = 0
    let ticketFails = 0
    let ticketUnfailed = 0

    const failedStatuses = ['Failed', 'failed', 'FAILED', 'QA Failed', 'Failed QA']

    allIssues.forEach(issue => {
      const assignee = issue.assignee || 'Unassigned'
      if (assignee !== developerName) return

      // Count story points
      storyPoints += issue.storyPoints || 0

      // Check status history for failures
      if (issue.statusHistory && issue.statusHistory.length > 0) {
        let hasFailed = false
        let hasUnfailed = false

        for (let i = 0; i < issue.statusHistory.length; i++) {
          const currentStatus = issue.statusHistory[i].status

          // Check if this status is a failed status
          if (failedStatuses.includes(currentStatus)) {
            hasFailed = true

            // Check if the ticket was later moved out of failed status
            if (i < issue.statusHistory.length - 1) {
              const nextStatus = issue.statusHistory[i + 1].status
              if (!failedStatuses.includes(nextStatus)) {
                hasUnfailed = true
              }
            }
          }
        }

        if (hasFailed) {
          ticketFails++
          if (hasUnfailed) {
            ticketUnfailed++
          }
        }
      }
    })

    return {
      storyPoints,
      ticketFails,
      ticketUnfailed
    }
  }

  // Calculate star ranking for a developer
  const calculateStarRating = (stats: AssigneeStats, metrics: ReturnType<typeof calculateDeveloperMetrics>) => {
    let score = 0
    let maxScore = 0
    const breakdown: string[] = []

    // 1. Story Points Completed (Weight: 30%)
    // Higher is better
    maxScore += 30
    let storyPointScore = 0
    if (stats.totalStoryPoints > 0) {
      const avgStoryPoints = totals.totalStoryPoints / data.length
      storyPointScore = Math.min(30, (stats.totalStoryPoints / avgStoryPoints) * 15)
      score += storyPointScore
      breakdown.push(`Story Points: ${stats.totalStoryPoints.toFixed(1)} (Team Avg: ${avgStoryPoints.toFixed(1)}) - ${((storyPointScore / 30) * 100).toFixed(0)}%`)
    } else {
      breakdown.push(`Story Points: 0 - 0%`)
    }

    // 2. Closed vs Total Issues Ratio (Weight: 25%)
    // Higher completion rate is better
    maxScore += 25
    let completionScore = 0
    if (stats.totalIssues > 0) {
      const completionRate = stats.closedIssues / stats.totalIssues
      completionScore = completionRate * 25
      score += completionScore
      breakdown.push(`Completion Rate: ${(completionRate * 100).toFixed(0)}% (${stats.closedIssues}/${stats.totalIssues}) - ${((completionScore / 25) * 100).toFixed(0)}%`)
    } else {
      breakdown.push(`Completion Rate: N/A - 0%`)
    }

    // 3. Development Time (Weight: 20%)
    // Lower is better (faster development)
    maxScore += 20
    let devTimeScore = 0
    if (stats.avgDevelopmentTimeDays > 0) {
      const avgDevTimeNum = totals.devTimeCount > 0 ? totals.totalDevTime / totals.devTimeCount : 0
      if (avgDevTimeNum > 0) {
        // Inverse score: faster developers get higher score
        devTimeScore = Math.max(0, 20 - ((stats.avgDevelopmentTimeDays / avgDevTimeNum) - 1) * 10)
        score += devTimeScore
        breakdown.push(`Dev Time: ${stats.avgDevelopmentTimeDays.toFixed(1)} days (Team Avg: ${avgDevTimeNum.toFixed(1)}) - ${((devTimeScore / 20) * 100).toFixed(0)}%`)
      }
    } else {
      breakdown.push(`Dev Time: N/A - 0%`)
    }

    // 4. Quality (Failed Tickets) (Weight: 15%)
    // Lower failure rate is better
    maxScore += 15
    let qualityScore = 0
    if (stats.totalIssues > 0) {
      const failureRate = metrics.ticketFails / stats.totalIssues
      qualityScore = Math.max(0, 15 * (1 - failureRate * 2)) // Penalize failures
      score += qualityScore
      breakdown.push(`Quality: ${((1 - failureRate) * 100).toFixed(0)}% pass rate (${metrics.ticketFails} failed) - ${((qualityScore / 15) * 100).toFixed(0)}%`)
    } else {
      qualityScore = 15
      score += qualityScore
      breakdown.push(`Quality: 100% pass rate (0 failed) - 100%`)
    }

    // 5. Assist/Recovery Rate (Weight: 10%)
    // Higher unfailed rate is better (shows ability to fix failed tickets)
    maxScore += 10
    let recoveryScore = 0
    if (metrics.ticketFails > 0) {
      const recoveryRate = metrics.ticketUnfailed / metrics.ticketFails
      recoveryScore = recoveryRate * 10
      score += recoveryScore
      breakdown.push(`Recovery Rate: ${(recoveryRate * 100).toFixed(0)}% (${metrics.ticketUnfailed}/${metrics.ticketFails} fixed) - ${((recoveryScore / 10) * 100).toFixed(0)}%`)
    } else {
      recoveryScore = 10
      score += recoveryScore
      breakdown.push(`Recovery Rate: N/A (no failures) - 100%`)
    }

    // Convert score to 1-5 stars
    const percentage = (score / maxScore) * 100

    let stars = 1
    if (percentage >= 90) stars = 5
    else if (percentage >= 75) stars = 4
    else if (percentage >= 60) stars = 3
    else if (percentage >= 45) stars = 2

    return {
      stars,
      percentage,
      breakdown
    }
  }

  // Calculate rankings and sort developers
  const rankedDevelopers = data.map(stats => {
    const metrics = calculateDeveloperMetrics(stats.name)
    const rating = calculateStarRating(stats, metrics)
    return {
      stats,
      metrics,
      starRating: rating.stars,
      ratingPercentage: rating.percentage,
      ratingBreakdown: rating.breakdown
    }
  }).sort((a, b) => {
    // Sort by star rating (descending), then by story points (descending)
    if (b.starRating !== a.starRating) {
      return b.starRating - a.starRating
    }
    return b.stats.totalStoryPoints - a.stats.totalStoryPoints
  })

  const handleRowClick = (developerName: string) => {
    setExpandedDevelopers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(developerName)) {
        newSet.delete(developerName)
      } else {
        newSet.add(developerName)
      }
      return newSet
    })
  }

  const handleExpandAll = () => {
    const allDevelopers = new Set(rankedDevelopers.map(({ stats }) => stats.name))
    setExpandedDevelopers(allDevelopers)
  }

  const handleCollapseAll = () => {
    setExpandedDevelopers(new Set())
  }

  const exportToExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new()

    // Combined data with main metrics and detailed sprint metrics
    const combinedData = [
      ['Team Performance Metrics'],
      [],
      [
        'Developer',
        'Total Issues',
        'Open',
        'Closed',
        'Story Points',
        'Avg Dev Time (days)',
        'Work (Story Points)',
        'Activity (Check-ins)',
        'Contribution (PRs)',
        'Assisted (Failed)',
        'Assisted (Unfailed)',
        'Test Coverage',
        'Rating (Stars)',
        'Rating Justification'
      ]
    ]

    // Add each developer's data with their metrics (using ranked developers to maintain ranking order)
    rankedDevelopers.forEach(({ stats, metrics, starRating, ratingBreakdown }) => {
      // Format rating breakdown as a single cell with line breaks
      const justification = ratingBreakdown.join('\n')

      combinedData.push([
        stats.name,
        stats.totalIssues,
        stats.openIssues,
        stats.closedIssues,
        stats.totalStoryPoints.toFixed(1),
        stats.avgDevelopmentTimeDays > 0 ? stats.avgDevelopmentTimeDays.toFixed(1) : '-',
        metrics.storyPoints.toFixed(1),
        '-', // Activity - No data yet
        '-', // Contribution - No data yet
        metrics.ticketFails,
        metrics.ticketUnfailed,
        '-', // Test Coverage - No data yet
        starRating,
        justification
      ])
    })

    // Add totals row
    combinedData.push([])
    combinedData.push([
      'Total',
      totals.totalIssues,
      totals.openIssues,
      totals.closedIssues,
      totals.totalStoryPoints.toFixed(1),
      avgDevTime,
      '', '', '', '', '', '', '', '' // Empty cells for detailed metrics totals, rating, and justification
    ])

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(combinedData)
    XLSX.utils.book_append_sheet(wb, ws, 'Team Performance')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `Team_Performance_${timestamp}.xlsx`

    // Save file
    XLSX.writeFile(wb, filename)
    setIsMenuOpen(false)
  }


  return (
    <div className="bg-container shadow-card border border-custom rounded-lg p-5 mb-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-primary">Team Performance</h3>
        <div className="flex items-center gap-2">
          {/* Toggle Expand/Collapse All Developers */}
          <button
            onClick={() => {
              if (expandedDevelopers.size > 0) {
                handleCollapseAll()
              } else {
                handleExpandAll()
              }
            }}
            className="w-8 h-8 flex items-center justify-center rounded text-2xl font-bold text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title={expandedDevelopers.size > 0 ? "Collapse All Developers" : "Expand All Developers"}
          >
            {expandedDevelopers.size > 0 ? '−' : '+'}
          </button>
          {/* Export Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-8 h-8 flex items-center justify-center rounded text-2xl font-bold text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Actions"
            >
              ⋮
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-custom rounded-lg shadow-lg z-10">
                <button
                  onClick={exportToExcel}
                  className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg"
                >
                  📥 Export Metrics to Excel
                </button>
              </div>
            )}
          </div>
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 flex items-center justify-center rounded text-2xl font-bold text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Collapse/Expand"
          >
            {isCollapsed ? '+' : '−'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="text-sm text-secondary italic mb-4">
            Click on a row to display developer individual performance metrics.
          </div>
          <div className="overflow-x-auto overflow-y-visible mt-4">
            <table className="w-full border-collapse text-sm relative">
              <thead className="bg-gray-100 dark:bg-gray-800 border-b-2 border-custom">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-primary uppercase text-xs tracking-wide">
                    Assignee
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-primary uppercase text-xs tracking-wide">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-primary uppercase text-xs tracking-wide">
                    Open
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-primary uppercase text-xs tracking-wide">
                    Closed
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-primary uppercase text-xs tracking-wide">
                    Story Points
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-primary uppercase text-xs tracking-wide">
                    Avg Development Time (days)
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-primary uppercase text-xs tracking-wide">
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankedDevelopers.map(({ stats, metrics, starRating, ratingPercentage, ratingBreakdown }) => {
                  const isExpanded = expandedDevelopers.has(stats.name)
                  const expandedMetrics = isExpanded ? metrics : null

                  return (
                    <React.Fragment key={stats.name}>
                      <tr
                        onClick={() => handleRowClick(stats.name)}
                        className={`border-b border-custom hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-primary/10' : ''
                        }`}
                      >
                        <td className={`px-4 py-3 text-primary ${isExpanded ? 'font-bold' : 'font-medium'}`}>{stats.name}</td>
                        <td className={`px-4 py-3 text-primary ${isExpanded ? 'font-bold' : ''}`}>{stats.totalIssues}</td>
                        <td className={`px-4 py-3 text-primary ${isExpanded ? 'font-bold' : ''}`}>{stats.openIssues}</td>
                        <td className={`px-4 py-3 text-primary ${isExpanded ? 'font-bold' : ''}`}>{stats.closedIssues}</td>
                        <td className={`px-4 py-3 text-primary ${isExpanded ? 'font-bold' : ''}`}>
                          {stats.totalStoryPoints > 0 ? stats.totalStoryPoints.toFixed(0) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-primary ${isExpanded ? 'font-bold' : ''}`}>
                          {stats.avgDevelopmentTimeDays > 0 ? stats.avgDevelopmentTimeDays.toFixed(1) : '-'}
                        </td>
                        <td
                          className={`px-4 py-3 text-primary relative ${isExpanded ? 'font-bold' : ''}`}
                        >
                          <span
                            className="cursor-help inline-block"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltipData({
                                percentage: ratingPercentage,
                                breakdown: ratingBreakdown,
                                x: rect.left,
                                y: rect.bottom
                              })
                            }}
                            onMouseLeave={() => setTooltipData(null)}
                          >
                            {'⭐'.repeat(starRating)}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded row for developer metrics */}
                      {isExpanded && expandedMetrics && (
                        <tr className="border-b border-custom bg-gray-50 dark:bg-gray-800/30">
                          <td colSpan={7} className="px-4 py-4">
                            <div>
                              <h4 className="text-base font-bold text-primary mb-3">
                                {stats.name}'s Sprint Metrics
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {/* Work: Total Story Points */}
                                <div className="bg-white dark:bg-gray-900 p-4 rounded border border-custom">
                                  <div className="text-xs font-semibold text-secondary uppercase mb-1">Work</div>
                                  <div className="text-2xl font-bold text-primary">{expandedMetrics.storyPoints.toFixed(1)}</div>
                                  <div className="text-xs text-secondary mt-1">Total Story Points in Sprint</div>
                                </div>

                                {/* Activity: No Data Yet */}
                                <div className="bg-white dark:bg-gray-900 p-4 rounded border border-custom opacity-60">
                                  <div className="text-xs font-semibold text-secondary uppercase mb-1">Activity</div>
                                  <div className="text-2xl font-bold text-secondary">-</div>
                                  <div className="text-xs text-secondary mt-1">Check-ins in Sprint (No Data Yet)</div>
                                </div>

                                {/* Contribution: No Data Yet */}
                                <div className="bg-white dark:bg-gray-900 p-4 rounded border border-custom opacity-60">
                                  <div className="text-xs font-semibold text-secondary uppercase mb-1">Contribution</div>
                                  <div className="text-2xl font-bold text-secondary">-</div>
                                  <div className="text-xs text-secondary mt-1">PRs in Sprint (No Data Yet)</div>
                                </div>

                                {/* Assisted: Ticket Fails and Unfailed */}
                                <div className="bg-white dark:bg-gray-900 p-4 rounded border border-custom">
                                  <div className="text-xs font-semibold text-secondary uppercase mb-1">Assisted</div>
                                  <div className="text-2xl font-bold text-primary">
                                    {expandedMetrics.ticketFails} / {expandedMetrics.ticketUnfailed}
                                  </div>
                                  <div className="text-xs text-secondary mt-1">Failed / Unfailed Tickets</div>
                                </div>

                                {/* Test Coverage: No Data Yet */}
                                <div className="bg-white dark:bg-gray-900 p-4 rounded border border-custom opacity-60">
                                  <div className="text-xs font-semibold text-secondary uppercase mb-1">Test Coverage</div>
                                  <div className="text-2xl font-bold text-secondary">-</div>
                                  <div className="text-xs text-secondary mt-1">Coverage in Sprint (No Data Yet)</div>
                                </div>
                              </div>
                            </div>
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
                  <td className="px-4 py-3 text-primary">{totals.totalIssues}</td>
                  <td className="px-4 py-3 text-primary">{totals.openIssues}</td>
                  <td className="px-4 py-3 text-primary">{totals.closedIssues}</td>
                  <td className="px-4 py-3 text-primary">{totals.totalStoryPoints.toFixed(0)}</td>
                  <td className="px-4 py-3 text-primary">{avgDevTime}</td>
                  <td className="px-4 py-3 text-primary">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* Portal tooltip */}
      {isMounted && tooltipData && createPortal(
        <div
          className="fixed w-80 max-w-[calc(100vw-2rem)] p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none"
          style={{
            left: `${tooltipData.x}px`,
            top: `${tooltipData.y + 8}px`
          }}
        >
          <div className="absolute bottom-full left-8 mb-[-1px]">
            <div className="border-8 border-transparent border-b-gray-900"></div>
          </div>
          <div className="font-bold mb-2 text-center">
            Rating Breakdown - {tooltipData.percentage.toFixed(1)}% Overall
          </div>
          <div className="space-y-1">
            {tooltipData.breakdown.map((line, idx) => (
              <div key={idx} className="text-left whitespace-normal break-words">{line}</div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
