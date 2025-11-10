'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Controls } from '@/components/Controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { SummaryCards } from '@/components/SummaryCards'
import { ChartsOverview } from '@/components/ChartsOverview'
import { TeamPerformanceTable } from '@/components/TeamPerformanceTable'
import { DeveloperWorkload } from '@/components/DeveloperWorkload'
import { SprintSlippage } from '@/components/SprintSlippage'
import { IssueCard } from '@/components/IssueCard'
import { StoryPointsWarning } from '@/components/StoryPointsWarning'
import { UnassignedTicketsWarning } from '@/components/UnassignedTicketsWarning'
import { AhaWarning } from '@/components/AhaWarning'
import { ChatDrawer } from '@/components/ChatDrawer'
import ReleaseNotesModal from '@/components/ReleaseNotesModal'
import { DashboardData, AssigneeStats, GitHubActivity } from '@/types'
import { fetchDashboardData, testConnection, testGitHubConnection, testAhaConnection, fetchGitHubDeveloperActivity } from '@/lib/api'
import * as XLSX from 'xlsx'

export default function DashboardPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [githubLoading, setGithubLoading] = useState(false)

  const [selectedInstance, setSelectedInstance] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedSprint, setSelectedSprint] = useState('')

  const [jiraConnectionStatus, setJiraConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [jiraConnectionMessage, setJiraConnectionMessage] = useState('Checking connection...')
  const [githubConnectionStatus, setGithubConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [githubConnectionMessage, setGithubConnectionMessage] = useState('Checking connection...')
  const [ahaConnectionStatus, setAhaConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [ahaConnectionMessage, setAhaConnectionMessage] = useState('Checking connection...')

  // Sprint Tickets filters
  const [developerFilter, setDeveloperFilter] = useState('all')
  const [keywordFilter, setKeywordFilter] = useState('')
  const [isSprintMenuOpen, setIsSprintMenuOpen] = useState(false)
  const sprintMenuRef = useRef<HTMLDivElement>(null)
  const [isSprintTicketsCollapsed, setIsSprintTicketsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jira_dashboard_sprint_tickets_collapsed')
      return saved === 'true'
    }
    return false
  })

  // Release Notes Modal
  const [showReleaseNotesModal, setShowReleaseNotesModal] = useState(false)
  const [releaseNotes, setReleaseNotes] = useState('')
  const [releaseNotesSprintName, setReleaseNotesSprintName] = useState('')
  const [generatingReleaseNotes, setGeneratingReleaseNotes] = useState(false)

  // Chat Drawer
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false)

  // Keyboard shortcut for Dashboard Assistant (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsChatDrawerOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Check JIRA connection when instance changes
  useEffect(() => {
    if (!selectedInstance) return

    async function checkJiraConnection() {
      setJiraConnectionStatus('checking')
      setJiraConnectionMessage('Checking JIRA...')

      try {
        const result = await testConnection(selectedInstance)
        if (result.success) {
          setJiraConnectionStatus('connected')
          setJiraConnectionMessage('Connected to JIRA')
        } else {
          setJiraConnectionStatus('error')
          setJiraConnectionMessage('JIRA Connection Failed')
          setError(result.error || 'Failed to connect to JIRA')
        }
      } catch (err) {
        setJiraConnectionStatus('error')
        setJiraConnectionMessage('JIRA Connection Error')
        setError(err instanceof Error ? err.message : 'Unable to check JIRA connection')
      }
    }

    checkJiraConnection()
  }, [selectedInstance])

  // Check GitHub connection on mount
  useEffect(() => {
    async function checkGithubConnection() {
      setGithubConnectionStatus('checking')
      setGithubConnectionMessage('Checking GitHub...')

      try {
        const result = await testGitHubConnection()
        if (!result.enabled) {
          setGithubConnectionStatus('error')
          setGithubConnectionMessage('GitHub Not Configured')
        } else {
          // Count connected repos
          let connectedCount = 0
          let totalCount = 0
          if (result.repoStatus) {
            totalCount = Object.keys(result.repoStatus).length
            connectedCount = Object.values(result.repoStatus).filter(status => status.connected).length
          }

          if (connectedCount === totalCount && totalCount > 0) {
            setGithubConnectionStatus('connected')
            setGithubConnectionMessage(`Connected to GitHub (${connectedCount} repos)`)
          } else if (connectedCount > 0) {
            setGithubConnectionStatus('connected')
            setGithubConnectionMessage(`GitHub: ${connectedCount}/${totalCount} repos`)
          } else {
            setGithubConnectionStatus('error')
            setGithubConnectionMessage('GitHub Connection Failed')
          }
        }
      } catch (err) {
        setGithubConnectionStatus('error')
        setGithubConnectionMessage('GitHub Connection Error')
      }
    }

    checkGithubConnection()
  }, [])

  // Check Aha connection on mount
  useEffect(() => {
    async function checkAhaConnection() {
      setAhaConnectionStatus('checking')
      setAhaConnectionMessage('Checking Aha...')

      try {
        const result = await testAhaConnection()
        if (result.success) {
          setAhaConnectionStatus('connected')
          setAhaConnectionMessage('Connected to Aha')
        } else {
          setAhaConnectionStatus('error')
          setAhaConnectionMessage('Aha Not Configured')
        }
      } catch (err) {
        setAhaConnectionStatus('error')
        setAhaConnectionMessage('Aha Not Configured')
      }
    }

    checkAhaConnection()
  }, [])

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

      // Set dashboard data immediately - don't wait for GitHub
      setData(result)

      // Fetch GitHub activity asynchronously in the background
      if (result.sprintInfo?.startDate && result.sprintInfo?.endDate) {
        loadGitHubActivity(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadGitHubActivity = async (dashboardData: DashboardData) => {
    if (!dashboardData.sprintInfo?.startDate || !dashboardData.sprintInfo?.endDate) {
      return
    }

    setGithubLoading(true)
    console.log('Fetching GitHub activity for sprint:', dashboardData.sprintInfo.startDate, 'to', dashboardData.sprintInfo.endDate)

    try {
      const githubActivity = await fetchGitHubDeveloperActivity(
        dashboardData.sprintInfo.startDate,
        dashboardData.sprintInfo.endDate
      )

      console.log('GitHub activity response:', githubActivity)
      console.log('Developers in GitHub:', Object.keys(githubActivity.developerActivity))
      console.log('Developers in JIRA:', dashboardData.assigneeStats.map(a => a.name))

      // Merge GitHub activity into assignee stats
      const updatedAssigneeStats: AssigneeStats[] = dashboardData.assigneeStats.map(assignee => {
        // Try to match by username (handle various formats)
        const githubUser = Object.keys(githubActivity.developerActivity).find(username => {
          // Try exact match
          if (username.toLowerCase() === assignee.name.toLowerCase()) return true
          // Try matching email
          if (username.includes('@') && username.toLowerCase().includes(assignee.name.toLowerCase().split(' ')[0])) return true
          // Try matching first/last name parts
          const nameParts = assignee.name.toLowerCase().split(' ')
          return nameParts.some(part => username.toLowerCase().includes(part))
        })

        if (githubUser) {
          console.log(`Matched JIRA developer "${assignee.name}" with GitHub user "${githubUser}"`)
          return {
            ...assignee,
            githubActivity: githubActivity.developerActivity[githubUser]
          }
        } else {
          console.log(`No GitHub match found for JIRA developer "${assignee.name}"`)
        }

        return assignee
      })

      // Update the data with GitHub activity
      setData(prevData => {
        if (!prevData) return prevData
        return {
          ...prevData,
          assigneeStats: updatedAssigneeStats
        }
      })
      console.log('GitHub activity loaded successfully')
    } catch (githubErr) {
      console.error('Failed to fetch GitHub activity:', githubErr)
      // Don't show error to user - just log it
    } finally {
      setGithubLoading(false)
    }
  }

  // Auto-load dashboard when selections change
  useEffect(() => {
    if (selectedInstance && selectedProject && selectedSprint && !loading) {
      loadDashboard()
    }
  }, [selectedInstance, selectedProject, selectedSprint])

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('jira_dashboard_sprint_tickets_collapsed', isSprintTicketsCollapsed.toString())
  }, [isSprintTicketsCollapsed])

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
        issue.storyPoints?.toString() || '0',
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
    setGeneratingReleaseNotes(true)

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

      const { releaseNotes: notes } = await response.json()

      // Show modal with release notes
      setReleaseNotes(notes)
      setReleaseNotesSprintName(data?.sprintInfo?.name || 'Current Sprint')
      setShowReleaseNotesModal(true)
    } catch (error) {
      console.error('Error generating release notes:', error)
      alert(`Failed to generate release notes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGeneratingReleaseNotes(false)
    }
  }


  return (
    <div className="min-h-screen">
      <div className="max-w-[1440px] mx-auto p-5">
        <Header onOpenChat={() => setIsChatDrawerOpen(true)} />

        <Controls
          selectedInstance={selectedInstance}
          setSelectedInstance={setSelectedInstance}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          selectedSprint={selectedSprint}
          setSelectedSprint={setSelectedSprint}
          jiraConnectionStatus={jiraConnectionStatus}
          jiraConnectionMessage={jiraConnectionMessage}
          githubConnectionStatus={githubConnectionStatus}
          githubConnectionMessage={githubConnectionMessage}
          ahaConnectionStatus={ahaConnectionStatus}
          ahaConnectionMessage={ahaConnectionMessage}
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

            {/* Unassigned Tickets Warning */}
            <UnassignedTicketsWarning
              issues={data.allIssues || []}
              jiraBaseUrl={data.jiraBaseUrl}
            />

            {/* Aha Warning */}
            <AhaWarning
              issues={data.allIssues || []}
              jiraBaseUrl={data.jiraBaseUrl}
              apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}
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
              assigneeStats={data.assigneeStats}
              allIssues={data.allIssues}
            />

            {/* Team Performance */}
            <TeamPerformanceTable data={data.assigneeStats} allIssues={data.allIssues} githubLoading={githubLoading} />

            {/* Developer Workload */}
            <DeveloperWorkload data={data.assigneeStats} allIssues={data.allIssues} jiraBaseUrl={data.jiraBaseUrl} githubLoading={githubLoading} />

            {/* Sprint Slippage */}
            <SprintSlippage
              allIssues={data.allIssues}
              jiraBaseUrl={data.jiraBaseUrl}
              currentSprintName={data.sprintInfo?.name}
              sprintInfo={data.sprintInfo}
            />

            {/* Sprint Tickets */}
            <div className="bg-container shadow-card border border-custom border-l-4 border-l-primary rounded-lg p-5 mb-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-primary">Sprint Tickets</h3>
                <div className="flex items-center gap-2">
                  {/* Export Menu */}
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
                          disabled={generatingReleaseNotes}
                          className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors last:rounded-b-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {generatingReleaseNotes && (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {generatingReleaseNotes ? 'Creating...' : 'Create Release Notes'}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Collapse/Expand Button */}
                  <button
                    onClick={() => setIsSprintTicketsCollapsed(!isSprintTicketsCollapsed)}
                    className="w-8 h-8 flex items-center justify-center rounded text-2xl font-bold text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="Collapse/Expand"
                  >
                    {isSprintTicketsCollapsed ? '+' : '−'}
                  </button>
                </div>
              </div>

              {!isSprintTicketsCollapsed && (
                <>
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

                  {/* Footer with total count */}
                  <div className="mt-4 pt-4 border-t border-custom">
                    <div className="text-sm text-secondary text-center">
                      Showing <span className="font-semibold text-primary">{filteredSprintIssues.length}</span> of <span className="font-semibold text-primary">{data.recentIssues?.length || 0}</span> ticket{(data.recentIssues?.length || 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-20 text-secondary">
            <p className="text-lg">Select a project and sprint to load the dashboard</p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 pt-5 border-t border-custom">
          <div className="flex justify-end text-xs text-secondary">
            <Link
              href="/tests"
              className="inline-block px-3 py-2 text-primary hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Test Application
            </Link>
          </div>
        </footer>
      </div>

      {/* Release Notes Modal */}
      <ReleaseNotesModal
        isOpen={showReleaseNotesModal}
        onClose={() => setShowReleaseNotesModal(false)}
        releaseNotes={releaseNotes}
        sprintName={releaseNotesSprintName}
      />

      {/* Loading Overlay for Release Notes Generation */}
      {generatingReleaseNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 flex flex-col items-center gap-4">
            <svg className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Creating Release Notes...</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">This may take a few moments</p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Drawer */}
      <ChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        dashboardData={data}
        isLoading={loading}
      />
    </div>
  )
}
