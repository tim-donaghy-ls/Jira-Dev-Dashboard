# Frontend API Client Documentation

## Overview

The frontend provides a TypeScript API client for interacting with the backend HTTP API, along with comprehensive TypeScript interfaces for type safety.

**Location:** [frontend/lib/api.ts](../../frontend/lib/api.ts)
**Types:** [frontend/types/index.ts](../../frontend/types/index.ts)

---

## Configuration

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
```

Configure the backend API URL using the `NEXT_PUBLIC_API_URL` environment variable.

---

## API Functions

### fetchInstances

Fetches the list of configured JIRA instances.

```typescript
async function fetchInstances(): Promise<{
  instances: JiraInstance[]
  count: number
}>
```

**Returns:**
- `instances` - Array of JIRA instance objects
- `count` - Number of instances

**Example:**
```typescript
const { instances } = await fetchInstances()
instances.forEach(i => console.log(i.name))
```

---

### testConnection

Tests the connection to a JIRA instance.

```typescript
async function testConnection(instance: string): Promise<{
  success: boolean
  error?: string
}>
```

**Parameters:**
- `instance` - Instance ID to test

**Returns:**
- `success` - Whether connection was successful
- `error` - Error message if connection failed

**Example:**
```typescript
const result = await testConnection('primary')
if (result.success) {
  console.log('Connected successfully')
}
```

---

### fetchProjects

Fetches all projects from a JIRA instance.

```typescript
async function fetchProjects(instance: string): Promise<{
  projects: JiraProject[]
  count: number
}>
```

**Parameters:**
- `instance` - Instance ID

**Returns:**
- `projects` - Array of project objects
- `count` - Number of projects

**Example:**
```typescript
const { projects } = await fetchProjects('primary')
```

---

### fetchSprints

Fetches all sprints for a project.

```typescript
async function fetchSprints(
  instance: string,
  project: string
): Promise<{
  sprints: JiraSprint[]
  count: number
}>
```

**Parameters:**
- `instance` - Instance ID
- `project` - Project key

**Returns:**
- `sprints` - Array of sprint objects
- `count` - Number of sprints

**Example:**
```typescript
const { sprints } = await fetchSprints('primary', 'MYPROJ')
```

---

### fetchDashboardData

Fetches comprehensive dashboard data with analytics.

```typescript
async function fetchDashboardData(
  options: FilterOptions
): Promise<DashboardData>
```

**Parameters:**
```typescript
interface FilterOptions {
  instance: string
  project: string
  sprint?: string  // Sprint ID or "all"
}
```

**Returns:**
- `DashboardData` - Complete dashboard data with analytics

**Example:**
```typescript
const dashboardData = await fetchDashboardData({
  instance: 'primary',
  project: 'MYPROJ',
  sprint: '123'
})

console.log(`Total Issues: ${dashboardData.summary.totalIssues}`)
```

---

### fetchIssueDetails

Fetches changelog and metrics for a specific issue.

```typescript
async function fetchIssueDetails(
  instance: string,
  issueKey: string
): Promise<{
  statusHistory: StatusHistory[]
  inProgressToQADays: number
  developmentTimeDays: number
}>
```

**Parameters:**
- `instance` - Instance ID
- `issueKey` - JIRA issue key (e.g., "PROJ-123")

**Returns:**
- `statusHistory` - Array of status changes
- `inProgressToQADays` - Time in QA (days)
- `developmentTimeDays` - Development time (days)

**Example:**
```typescript
const details = await fetchIssueDetails('primary', 'MYPROJ-123')
console.log(`Dev Time: ${details.developmentTimeDays.toFixed(1)} days`)
```

---

### testGitHubConnection

Tests GitHub API connection.

```typescript
async function testGitHubConnection(): Promise<{
  enabled: boolean
  owner?: string
  repos?: string[]
  repoStatus?: Record<string, { connected: boolean; error?: string }>
  message?: string
}>
```

**Returns:**
- `enabled` - Whether GitHub integration is configured
- `owner` - Repository owner
- `repos` - List of repository names
- `repoStatus` - Connection status for each repository
- `message` - Status message

**Timeout:** 70 seconds (to accommodate multiple repositories)

**Example:**
```typescript
const status = await testGitHubConnection()
if (status.enabled) {
  console.log(`Tracking ${status.repos?.length} repositories`)
}
```

---

### fetchGitHubDeveloperActivity

Fetches aggregated developer activity from GitHub.

```typescript
async function fetchGitHubDeveloperActivity(
  startDate: string,
  endDate: string
): Promise<{
  developerActivity: Record<string, GitHubActivity>
  startDate: string
  endDate: string
  repos: string[]
}>
```

**Parameters:**
- `startDate` - Start date (ISO 8601 format)
- `endDate` - End date (ISO 8601 format)

**Returns:**
- `developerActivity` - Map of username to activity stats
- `startDate` - Actual start date used
- `endDate` - Actual end date used
- `repos` - List of repositories included

**Example:**
```typescript
const activity = await fetchGitHubDeveloperActivity(
  '2025-01-01T00:00:00Z',
  '2025-01-15T00:00:00Z'
)

Object.entries(activity.developerActivity).forEach(([username, stats]) => {
  console.log(`${username}: ${stats.commits} commits, ${stats.prs} PRs`)
})
```

---

### testAhaConnection

Tests Aha API connection.

```typescript
async function testAhaConnection(): Promise<{
  success: boolean
  message?: string
}>
```

**Returns:**
- `success` - Whether connection was successful
- `message` - Status or error message

**Example:**
```typescript
const result = await testAhaConnection()
if (result.success) {
  console.log('Aha integration is working')
}
```

---

### verifyAhaFeatures

Verifies if JIRA tickets exist in Aha.

```typescript
async function verifyAhaFeatures(jiraKeys: string[]): Promise<{
  jiraKey: string
  existsInAha: boolean
  ahaReference?: string
  ahaUrl?: string
  ahaStatus?: string
  error?: string
}[]>
```

**Parameters:**
- `jiraKeys` - Array of JIRA ticket keys to verify

**Returns:**
- Array of verification results, one per JIRA key

**Timeout:** 30 seconds

**Example:**
```typescript
const verifications = await verifyAhaFeatures(['PROJ-123', 'PROJ-456'])

verifications.forEach(v => {
  if (v.existsInAha) {
    console.log(`${v.jiraKey} -> ${v.ahaReference}`)
  } else {
    console.log(`${v.jiraKey} not found in Aha`)
  }
})
```

---

## TypeScript Interfaces

### Core Data Types

```typescript
interface JiraInstance {
  id: string
  name: string
}

interface JiraProject {
  key: string
  name: string
}

interface JiraSprint {
  id: number
  name: string
  state: 'active' | 'future' | 'closed'
}

interface JiraIssue {
  key: string
  summary: string
  description?: string
  status: string
  priority: string
  issueType: string
  assignee?: string
  created: string
  updated: string
  storyPoints?: number
  developmentTimeDays?: number
  inProgressToQADays?: number
  statusHistory?: StatusHistory[]
}

interface StatusHistory {
  status: string
  fromStatus?: string
  timestamp: string
}
```

### Dashboard Data

```typescript
interface DashboardData {
  jiraBaseUrl: string
  sprintInfo?: SprintInfo
  summary: DashboardSummary
  statusBreakdown: StatusBreakdown
  priorityBreakdown: PriorityBreakdown
  assigneeStats: AssigneeStats[]
  recentIssues: JiraIssue[]
  allIssues: JiraIssue[]
  ahaVerifications?: Record<string, AhaVerification>
}

interface DashboardSummary {
  totalIssues: number
  openIssues: number
  closedIssues: number
  totalStoryPoints: number
  openStoryPoints: number
  closedStoryPoints: number
  avgResolutionDays: number
}

interface AssigneeStats {
  name: string
  totalIssues: number
  openIssues: number
  closedIssues: number
  totalStoryPoints: number
  avgDevelopmentTimeDays: number
  avgInProgressToQADays: number
  statusBreakdown?: StatusBreakdown
  githubActivity?: GitHubActivity
}
```

### GitHub Types

```typescript
interface GitHubActivity {
  username: string
  commits: number
  prs: number
  prsMerged: number
  additions: number
  deletions: number
  lastActivity: string
  testCoverage?: number
}
```

### Aha Types

```typescript
interface AhaVerification {
  jiraKey: string
  existsInAha: boolean
  ahaReference?: string
  ahaUrl?: string
  ahaStatus?: string
  error?: string
}
```

### Chat Types

```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatQueryRequest {
  query: string
  dashboardData: DashboardData
}

interface ChatQueryResponse {
  answer: string
  error?: string
}
```

---

## Error Handling

All API functions throw errors on failure. Use try-catch blocks for error handling:

```typescript
try {
  const data = await fetchDashboardData(options)
  // Handle success
} catch (error) {
  if (error instanceof Error) {
    console.error('API Error:', error.message)
  }
}
```

**Common Errors:**
- `"Request timeout - please try again"` - Request exceeded timeout
- `"Failed to fetch data"` - Network or server error
- HTTP error messages from the backend

---

## Timeout Configuration

The internal `fetchAPI` function uses configurable timeouts:

- Default: 30 seconds
- GitHub status check: 70 seconds (for multiple repositories)
- Aha verification: 30 seconds

Custom timeout example:
```typescript
// Internal function signature (not exported)
async function fetchAPI<T>(
  endpoint: string,
  timeoutMs: number = 30000
): Promise<T>
```

---

## Usage Example

```typescript
import {
  fetchInstances,
  fetchProjects,
  fetchSprints,
  fetchDashboardData,
  testGitHubConnection,
  verifyAhaFeatures
} from '@/lib/api'

async function loadDashboard() {
  try {
    // Get available instances
    const { instances } = await fetchInstances()
    const instanceId = instances[0].id

    // Get projects
    const { projects } = await fetchProjects(instanceId)
    const projectKey = projects[0].key

    // Get sprints
    const { sprints } = await fetchSprints(instanceId, projectKey)
    const sprintId = sprints[0].id.toString()

    // Load dashboard data
    const dashboardData = await fetchDashboardData({
      instance: instanceId,
      project: projectKey,
      sprint: sprintId
    })

    console.log('Dashboard loaded:', dashboardData.summary)

    // Check GitHub integration
    const githubStatus = await testGitHubConnection()
    if (githubStatus.enabled) {
      console.log('GitHub integration is active')
    }

    // Verify Aha features
    const jiraKeys = dashboardData.recentIssues
      .slice(0, 10)
      .map(i => i.key)
    const verifications = await verifyAhaFeatures(jiraKeys)
    console.log(`Verified ${verifications.length} tickets with Aha`)

  } catch (error) {
    console.error('Failed to load dashboard:', error)
  }
}
```

---

## Notes

- All API calls are asynchronous and return Promises
- TypeScript provides full type safety for all API responses
- The API client handles URL encoding of query parameters
- CORS is supported for cross-origin requests
- All timestamps are in ISO 8601 format
- The client automatically constructs the correct API URLs
