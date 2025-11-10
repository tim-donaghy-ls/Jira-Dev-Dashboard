export interface JiraInstance {
  id: string
  name: string
}

export interface JiraProject {
  key: string
  name: string
}

export interface JiraSprint {
  id: number
  name: string
  state: 'active' | 'future' | 'closed'
}

export interface SprintInfo {
  name: string
  startDate?: string
  endDate?: string
}

export interface DashboardSummary {
  totalIssues: number
  openIssues: number
  closedIssues: number
  totalStoryPoints: number
  openStoryPoints: number
  closedStoryPoints: number
  avgResolutionDays: number
}

export interface StatusBreakdown {
  [status: string]: number
}

export interface PriorityBreakdown {
  [priority: string]: number
}

export interface StatusHistory {
  status: string
  fromStatus?: string
  timestamp: string
}

export interface JiraIssue {
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

export interface GitHubActivity {
  username: string
  commits: number
  prs: number
  prsMerged: number
  additions: number
  deletions: number
  lastActivity: string
  testCoverage?: number
}

export interface AssigneeStats {
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

export interface DashboardData {
  jiraBaseUrl: string
  sprintInfo?: SprintInfo
  summary: DashboardSummary
  statusBreakdown: StatusBreakdown
  priorityBreakdown: PriorityBreakdown
  assigneeStats: AssigneeStats[]
  recentIssues: JiraIssue[]
  allIssues: JiraIssue[]
  ahaVerifications?: Record<string, AhaVerification> // Map of JIRA key -> Aha verification
}

export interface FilterOptions {
  instance: string
  project: string
  sprint?: string
}

export interface AhaVerification {
  jiraKey: string
  existsInAha: boolean
  ahaReference?: string
  ahaUrl?: string
  ahaStatus?: string
  error?: string
}

// Chat types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatQueryRequest {
  query: string
  dashboardData: DashboardData
}

export interface ChatQueryResponse {
  answer: string
  error?: string
}
