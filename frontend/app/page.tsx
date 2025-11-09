'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/Header'
import { Controls } from '@/components/Controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { SummaryCards } from '@/components/SummaryCards'
import { ChartsOverview } from '@/components/ChartsOverview'
import { TeamPerformanceTable } from '@/components/TeamPerformanceTable'
import { DeveloperWorkload } from '@/components/DeveloperWorkload'
import { IssueCard } from '@/components/IssueCard'
import { StoryPointsWarning } from '@/components/StoryPointsWarning'
import { DashboardData } from '@/types'
import { fetchDashboardData, testConnection } from '@/lib/api'
import * as XLSX from 'xlsx'

export default function DashboardPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')

  const [selectedInstance, setSelectedInstance] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedSprint, setSelectedSprint] = useState('')

  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [connectionMessage, setConnectionMessage] = useState('Checking connection...')

  // Sprint Tickets filters
  const [developerFilter, setDeveloperFilter] = useState('all')
  const [keywordFilter, setKeywordFilter] = useState('')
  const [isSprintMenuOpen, setIsSprintMenuOpen] = useState(false)
  const sprintMenuRef = useRef<HTMLDivElement>(null)

  // Check connection when instance changes
  useEffect(() => {
    if (!selectedInstance) return

    async function checkConnection() {
      setConnectionStatus('checking')
      setConnectionMessage('Checking connection...')

      try {
        const result = await testConnection(selectedInstance)
        if (result.success) {
          setConnectionStatus('connected')
          setConnectionMessage('Connected to JIRA')
        } else {
          setConnectionStatus('error')
          setConnectionMessage('Connection Failed')
          setError(result.error || 'Failed to connect to JIRA')
        }
      } catch (err) {
        setConnectionStatus('error')
        setConnectionMessage('Connection Error')
        setError(err instanceof Error ? err.message : 'Unable to check JIRA connection')
      }
    }

    checkConnection()
  }, [selectedInstance])

  const loadDashboard = async () => {
    if (!selectedProject) {
      setError('Please select a project')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await fetchDashboardData({
        instance: selectedInstance,
        project: selectedProject,
        sprint: selectedSprint,
      })
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-load dashboard when all selections are filled
  useEffect(() => {
    if (selectedInstance && selectedProject && selectedSprint && !loading && !data) {
      loadDashboard()
    }
  }, [selectedInstance, selectedProject, selectedSprint])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sprintMenuRef.current && !sprintMenuRef.current.contains(event.target as Node)) {
        setIsSprintMenuOpen(false)
      }
    }

    if (isSprintMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isSprintMenuOpen])

  // Filter sprint tickets
  const filteredSprintIssues = data?.recentIssues?.filter(issue => {
    // Developer filter
    if (developerFilter !== 'all') {
      const assignee = issue.assignee || 'Unassigned'
      if (assignee !== developerFilter) return false
    }

    // Keyword filter
    if (keywordFilter && keywordFilter.trim() !== '') {
      const searchTerm = keywordFilter.toLowerCase().trim()
      const matchesKey = issue.key.toLowerCase().includes(searchTerm)
      const matchesSummary = issue.summary?.toLowerCase().includes(searchTerm)
      const matchesDescription = issue.description?.toLowerCase().includes(searchTerm)
      if (!matchesKey && !matchesSummary && !matchesDescription) return false
    }

    return true
  }) || []

  // Get unique developers for filter dropdown
  const uniqueDevelopers = Array.from(
    new Set(data?.recentIssues?.map(issue => issue.assignee || 'Unassigned') || [])
  ).sort()

  // Export sprint tickets to Excel
  const exportSprintTickets = () => {
    if (!filteredSprintIssues || filteredSprintIssues.length === 0) {
      alert('No tickets to export')
      return
    }

    const wb = XLSX.utils.book_new()

    // Create header row
    const exportData = [
      ['Sprint Tickets Export'],
      [],
      [
        'Ticket Key',
        'Summary',
        'Status',
        'Priority',
        'Type',
        'Assignee',
        'Story Points',
        'Created',
        'Updated',
        'Description'
      ]
    ]

    // Add each ticket's data
    filteredSprintIssues.forEach(issue => {
      exportData.push([
        issue.key,
        issue.summary || '',
        issue.status || '',
        issue.priority || '',
        issue.issueType || '',
        issue.assignee || 'Unassigned',
        issue.storyPoints || 0,
        issue.created ? new Date(issue.created).toLocaleDateString() : '',
        issue.updated ? new Date(issue.updated).toLocaleDateString() : '',
        issue.description || ''
      ])
    })

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(exportData)
    XLSX.utils.book_append_sheet(wb, ws, 'Sprint Tickets')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const sprintName = data?.sprintInfo?.name ? `_${data.sprintInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}` : ''
    const filename = `Sprint_Tickets${sprintName}_${timestamp}.xlsx`

    // Save file
    XLSX.writeFile(wb, filename)
    setIsSprintMenuOpen(false)
  }

  // Generate release notes using Claude
  const generateReleaseNotes = async () => {
    if (!filteredSprintIssues || filteredSprintIssues.length === 0) {
      alert('No tickets to generate release notes from')
      return
    }

    setIsSprintMenuOpen(false)

    // Show loading indicator
    const loadingAlert = alert('Generating release notes with Claude AI...')

    try {
      const response = await fetch('/api/generate-release-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tickets: filteredSprintIssues.map(issue => ({
            key: issue.key,
            summary: issue.summary,
            description: issue.description,
            issueType: issue.issueType,
            status: issue.status,
            priority: issue.priority,
          })),
          sprintName: data?.sprintInfo?.name || 'Current Sprint',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate release notes')
      }

      const { releaseNotes } = await response.json()

      // Create a text file with the release notes
      const timestamp = new Date().toISOString().split('T')[0]
      const sprintName = data?.sprintInfo?.name ? `_${data.sprintInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}` : ''
      const filename = `Release_Notes${sprintName}_${timestamp}.md`

      // Create blob and download
      const blob = new Blob([releaseNotes], { type: 'text/markdown' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      alert('Release notes generated successfully!')
    } catch (error) {
      console.error('Error generating release notes:', error)
      alert(`Failed to generate release notes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1440px] mx-auto p-5">
        <Header
          connectionStatus={connectionStatus}
          connectionMessage={connectionMessage}
        />

        <Controls
          onLoad={loadDashboard}
          selectedInstance={selectedInstance}
          setSelectedInstance={setSelectedInstance}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          selectedSprint={selectedSprint}
          setSelectedSprint={setSelectedSprint}
        />

        {error && <ErrorMessage message={error} />}

        {loading && <LoadingSpinner />}

        {!loading && data && (
          <>
            {/* Story Points Warning */}
            <StoryPointsWarning
              issues={data.allIssues || []}
              jiraBaseUrl={data.jiraBaseUrl}
            />

            {/* Sprint Info */}
            {data.sprintInfo && (
              <div className="flex flex-col gap-2.5 p-5 bg-container border border-custom border-l-4 border-l-primary rounded-lg mb-5 shadow-card">
                <div className="text-xl font-bold tracking-tight text-primary">
                  {data.sprintInfo.name}
                </div>
                <div className="flex gap-8 text-sm text-secondary">
                  {data.sprintInfo.startDate && (
                    <div className="flex gap-2">
                      <span className="font-semibold">Start:</span>
                      <span>{new Date(data.sprintInfo.startDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}</span>
                    </div>
                  )}
                  {data.sprintInfo.endDate && (
                    <div className="flex gap-2">
                      <span className="font-semibold">End:</span>
                      <span>{new Date(data.sprintInfo.endDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <SummaryCards
              data={data.summary}
              jiraBaseUrl={data.jiraBaseUrl}
              sprintId={selectedSprint !== 'all' ? selectedSprint : undefined}
              projectKey={selectedProject}
            />

            {/* Charts */}
            <ChartsOverview
              statusData={data.statusBreakdown}
              priorityData={data.priorityBreakdown}
            />

            {/* Team Performance */}
            <TeamPerformanceTable data={data.assigneeStats} allIssues={data.allIssues} />

            {/* Developer Workload */}
            <DeveloperWorkload data={data.assigneeStats} allIssues={data.allIssues} jiraBaseUrl={data.jiraBaseUrl} />

            {/* Sprint Tickets */}
            <div className="bg-container shadow-card border border-custom border-l-4 border-l-primary rounded-lg p-5 mb-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-primary">Sprint Tickets</h3>
                <div className="relative" ref={sprintMenuRef}>
                  <button
                    onClick={() => setIsSprintMenuOpen(!isSprintMenuOpen)}
                    className="w-8 h-8 flex items-center justify-center rounded text-2xl font-bold text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="Actions"
                  >
                    ⋮
                  </button>
                  {isSprintMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-custom rounded-lg shadow-lg z-10">
                      <button
                        onClick={exportSprintTickets}
                        className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg border-b border-custom"
                      >
                        Export Tickets in Sprint
                      </button>
                      <button
                        onClick={generateReleaseNotes}
                        className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors last:rounded-b-lg"
                      >
                        Create Release Notes
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap gap-4 items-end mb-4">
                <div className="flex flex-col gap-1.5 min-w-[200px] flex-1">
                  <label htmlFor="developerFilter" className="text-sm font-semibold text-primary">
                    Filter by Developer:
                  </label>
                  <select
                    id="developerFilter"
                    value={developerFilter}
                    onChange={(e) => setDeveloperFilter(e.target.value)}
                    className="px-3.5 py-2.5 border border-custom rounded-lg text-base bg-card text-primary transition-all duration-200 hover:border-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="all">All Developers</option>
                    {uniqueDevelopers.map(dev => (
                      <option key={dev} value={dev}>{dev}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[200px] flex-1">
                  <label htmlFor="keywordFilter" className="text-sm font-semibold text-primary">
                    Search:
                  </label>
                  <input
                    type="text"
                    id="keywordFilter"
                    value={keywordFilter}
                    onChange={(e) => setKeywordFilter(e.target.value)}
                    placeholder="Ticket ID, keyword, text..."
                    className="px-3.5 py-2.5 border border-custom rounded-lg text-base bg-card text-primary transition-all duration-200 hover:border-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-1">
                {filteredSprintIssues.length > 0 ? (
                  filteredSprintIssues.map((issue) => (
                    <IssueCard
                      key={issue.key}
                      issue={issue}
                      jiraBaseUrl={data.jiraBaseUrl}
                      instance={selectedInstance}
                    />
                  ))
                ) : (
                  <p className="text-center text-secondary py-5">
                    {data.recentIssues && data.recentIssues.length > 0
                      ? 'No issues found matching the current filters.'
                      : 'No issues found'}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-20 text-secondary">
            <p className="text-lg">Select a project and click "Load Dashboard" to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
