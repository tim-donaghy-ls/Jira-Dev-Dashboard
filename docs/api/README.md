# API Documentation

Complete API documentation for the JIRA Dev Dashboard application.

## Overview

This directory contains comprehensive documentation for all public APIs in the JIRA Dev Dashboard, covering both backend (Go) and frontend (TypeScript/React) components.

---

## Documentation Files

### Backend API Documentation

#### [Config Package](./backend-config.md)
Configuration management for JIRA instances, GitHub, and Aha integrations.

**Key APIs:**
- `LoadConfig()` - Load application configuration
- `Config.GetInstance()` - Get specific JIRA instance
- `Config.GetDefaultInstance()` - Get default JIRA instance

#### [JIRA Package](./backend-jira.md)
JIRA REST API client for issue management, sprint tracking, and changelog retrieval.

**Key APIs:**
- `NewClient()` - Create JIRA client
- `SearchIssues()` - Search issues with JQL
- `GetIssuesByProject()`, `GetIssuesBySprint()` - Retrieve issues
- `GetProjects()`, `GetSprintsByProject()` - Get projects and sprints
- `GetIssueChangelog()` - Get issue status history
- `CalculateDevelopmentMetrics()` - Calculate dev time metrics

#### [GitHub Package](./backend-github.md)
GitHub REST API client for tracking developer activity and code contributions.

**Key APIs:**
- `NewClient()` - Create GitHub client
- `GetPullRequests()` - Fetch pull requests
- `GetCommits()` - Fetch commits
- `GetDeveloperStats()` - Calculate developer statistics
- `TestConnection()` - Test GitHub connection

#### [Aha Package](./backend-aha.md)
Aha! product management API client for feature verification.

**Key APIs:**
- `NewClient()` - Create Aha client
- `VerifyFeatures()` - Verify JIRA tickets in Aha
- `GetFeatureByReference()` - Get feature details
- `TestConnection()` - Test Aha connection

#### [Analysis Package](./backend-analysis.md)
Data analysis engine for calculating metrics and generating dashboard insights.

**Key APIs:**
- `NewAnalyzer()` - Create analyzer
- `Analyze()` - Perform comprehensive analysis
- `FilterByDateRange()`, `FilterBySprint()` - Filter issues

#### [HTTP API](./backend-http-api.md)
RESTful HTTP API endpoints for accessing all dashboard functionality.

**Endpoint Categories:**
- JIRA endpoints (`/api/dashboard`, `/api/projects`, `/api/sprints`, etc.)
- GitHub endpoints (`/api/github/stats`, `/api/github/commits`, etc.)
- Aha endpoints (`/api/aha/verify`, `/api/aha/test-connection`)

### Frontend API Documentation

#### [Frontend API Client](./frontend-api.md)
TypeScript API client and type definitions for frontend-backend communication.

**Key Functions:**
- `fetchInstances()`, `fetchProjects()`, `fetchSprints()` - Fetch JIRA data
- `fetchDashboardData()` - Get complete dashboard data
- `fetchGitHubDeveloperActivity()` - Get GitHub statistics
- `verifyAhaFeatures()` - Verify Aha linkages

**TypeScript Interfaces:**
- `JiraInstance`, `JiraProject`, `JiraSprint`, `JiraIssue`
- `DashboardData`, `DashboardSummary`, `AssigneeStats`
- `GitHubActivity`, `AhaVerification`
- `ChatMessage`, `ChatQueryRequest`, `ChatQueryResponse`

---

## Quick Start

### Backend API Usage

```go
package main

import (
    "jira-dashboard/config"
    "jira-dashboard/jira"
    "jira-dashboard/analysis"
    "log"
)

func main() {
    // Load configuration
    cfg, _ := config.LoadConfig()

    // Create JIRA client
    instance := cfg.GetDefaultInstance()
    client := jira.NewClient(instance.BaseURL, instance.Email, instance.Token)

    // Fetch issues
    issues, _ := client.GetIssuesByProject("MYPROJ")

    // Analyze data
    analyzer := analysis.NewAnalyzer(issues)
    dashboardData := analyzer.Analyze()

    log.Printf("Total Issues: %d", dashboardData.Summary.TotalIssues)
}
```

### Frontend API Usage

```typescript
import { fetchDashboardData } from '@/lib/api'

async function loadDashboard() {
  const data = await fetchDashboardData({
    instance: 'primary',
    project: 'MYPROJ',
    sprint: '123'
  })

  console.log(`Total Issues: ${data.summary.totalIssues}`)
  console.log(`Completion: ${data.summary.closedIssues / data.summary.totalIssues * 100}%`)
}
```

---

## API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js/React)             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  lib/api.ts  - TypeScript API Client                  │ │
│  │  types/index.ts - TypeScript Interfaces               │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/JSON
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Backend HTTP API (Go)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  api/handlers.go  - HTTP request handlers             │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────┬─────────────────┬────────────────┬───────────┘
               │                 │                │
       ┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼─────┐
       │ jira/        │  │ github/      │  │ aha/      │
       │ client.go    │  │ client.go    │  │ client.go │
       └───────┬──────┘  └──────┬───────┘  └─────┬─────┘
               │                │                │
       ┌───────▼────────────────▼────────────────▼─────┐
       │        analysis/analyzer.go                   │
       │        (Data Analysis & Metrics)              │
       └───────────────────────────────────────────────┘
```

---

## Authentication & Configuration

### Backend Configuration

Set these environment variables:

```bash
# JIRA Configuration
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=your_jira_api_token

# GitHub Configuration (Optional)
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your-org
GITHUB_REPOS=repo1,repo2,repo3

# Aha Configuration (Optional)
AHA_API_KEY=your_aha_api_key
AHA_DOMAIN=your-company

# Server Configuration
SERVER_PORT=8080
```

### Frontend Configuration

Set in `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## API Conventions

### Date/Time Format
- All timestamps use ISO 8601 / RFC3339 format
- Example: `"2025-01-15T10:30:00Z"`

### Error Handling
- HTTP status codes follow REST conventions
- Error responses include descriptive messages
- Frontend wraps all API calls in try-catch

### Naming Conventions
- **Go:** PascalCase for exported functions, camelCase for internal
- **TypeScript:** camelCase for functions, PascalCase for interfaces
- **HTTP endpoints:** kebab-case paths

### Response Format
All HTTP API responses return JSON:
```json
{
  "data": { },
  "count": 0,
  "error": "optional error message"
}
```

---

## Performance Considerations

### Backend
- Parallel processing for issue changelog fetching (max 10 concurrent)
- HTTP client timeouts: 30-45 seconds
- JIRA API: Max 1000 results per query
- GitHub API: Max 100 results per query
- Aha API: Rate limited to 20 requests/second

### Frontend
- Request timeouts: 30-70 seconds depending on endpoint
- Automatic retry on timeout (manual refresh required)
- Data caching handled by React Query (if implemented)

---

## Contributing

When adding new API endpoints or functions:

1. **Update the appropriate documentation file**
2. **Add TypeScript types** for frontend integration
3. **Include usage examples** with real-world scenarios
4. **Document error cases** and their handling
5. **Update this README** with new sections if needed

---

## Support & Issues

For API questions or issues:
- Check the detailed documentation files above
- Review the source code with inline comments
- Submit issues to the project repository

---

## Version History

- **v1.0** (2025-01-15) - Initial comprehensive API documentation
  - Backend: Config, JIRA, GitHub, Aha, Analysis packages
  - Frontend: API client and TypeScript interfaces
  - HTTP API: Complete endpoint documentation

---

## Documentation Coverage

### Backend Coverage
- ✅ Config Package (100%)
- ✅ JIRA Package (100%)
- ✅ GitHub Package (100%)
- ✅ Aha Package (100%)
- ✅ Analysis Package (100%)
- ✅ HTTP API Endpoints (100%)

### Frontend Coverage
- ✅ API Client Functions (100%)
- ✅ TypeScript Interfaces (100%)
- ✅ Type Definitions (100%)

**Overall API Documentation Coverage: 100%**

---

## Related Documentation

- [Architecture Overview](../../ARCHITECTURE.md)
- [Components Guide](../../COMPONENTS_GUIDE.md)
- [API Documentation](../../API_DOCUMENTATION.md)
- [Testing Guide](../../TESTING.md)
- [Setup Guide](../../QUICKSTART.md)
