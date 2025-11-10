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

async function fetchAPI<T>(endpoint: string, timeoutMs: number = 30000): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || 'Failed to fetch data')
    }

    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please try again')
    }
    throw error
  }
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
  // Use 70s timeout for GitHub status check to accommodate many repos
  return fetchAPI('/api/github/status', 70000)
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

export async function testAhaConnection(): Promise<{
  success: boolean
  message?: string
}> {
  return fetchAPI('/api/aha/test-connection')
}

export async function verifyAhaFeatures(jiraKeys: string[]): Promise<{
  jiraKey: string
  existsInAha: boolean
  ahaReference?: string
  ahaUrl?: string
  ahaStatus?: string
  error?: string
}[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${API_BASE_URL}/api/aha/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jiraKeys }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 503) {
        // Aha not configured - return empty array
        return []
      }
      throw new Error('Failed to verify Aha features')
    }

    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Aha verification timeout')
    }
    throw error
  }
}
