import {
  JiraInstance,
  JiraProject,
  JiraSprint,
  DashboardData,
  FilterOptions,
  JiraIssue,
  StatusHistory,
  GitHubActivity
} from '@/types'

// Configure the API base URL
// In production, this should point to your Go backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Failed to fetch data')
  }

  return response.json()
}

export async function fetchInstances(): Promise<{ instances: JiraInstance[], count: number }> {
  return fetchAPI('/api/instances')
}

export async function testConnection(instance: string): Promise<{ success: boolean, error?: string }> {
  return fetchAPI(`/api/test-connection?instance=${encodeURIComponent(instance)}`)
}

export async function fetchProjects(instance: string): Promise<{ projects: JiraProject[], count: number }> {
  return fetchAPI(`/api/projects?instance=${encodeURIComponent(instance)}`)
}

export async function fetchSprints(instance: string, project: string): Promise<{ sprints: JiraSprint[], count: number }> {
  return fetchAPI(`/api/sprints?instance=${encodeURIComponent(instance)}&project=${encodeURIComponent(project)}`)
}

export async function fetchDashboardData(options: FilterOptions): Promise<DashboardData> {
  let url = `/api/dashboard?instance=${encodeURIComponent(options.instance)}&project=${encodeURIComponent(options.project)}`

  if (options.sprint && options.sprint !== 'all') {
    url += `&sprint=${encodeURIComponent(options.sprint)}`
  }

  return fetchAPI(url)
}

export async function fetchIssueDetails(instance: string, issueKey: string): Promise<{
  statusHistory: StatusHistory[]
  inProgressToQADays: number
  developmentTimeDays: number
}> {
  return fetchAPI(`/api/issue/${issueKey}?instance=${encodeURIComponent(instance)}`)
}

export async function testGitHubConnection(): Promise<{
  enabled: boolean
  owner?: string
  repos?: string[]
  repoStatus?: Record<string, { connected: boolean; error?: string }>
  message?: string
}> {
  return fetchAPI('/api/github/status')
}

export async function fetchGitHubDeveloperActivity(
  startDate: string,
  endDate: string
): Promise<{
  developerActivity: Record<string, GitHubActivity>
  startDate: string
  endDate: string
  repos: string[]
}> {
  const url = `/api/github/developer-activity?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`
  return fetchAPI(url)
}
