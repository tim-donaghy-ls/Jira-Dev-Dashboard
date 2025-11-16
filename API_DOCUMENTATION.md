# JIRA Dev Dashboard - API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URLs](#base-urls)
4. [Response Formats](#response-formats)
5. [JIRA API Endpoints](#jira-api-endpoints)
6. [GitHub API Endpoints](#github-api-endpoints)
7. [Aha! API Endpoints](#aha-api-endpoints)
8. [Next.js API Routes](#nextjs-api-routes)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

---

## Overview

The JIRA Dev Dashboard API provides access to team performance analytics, sprint metrics, and developer productivity data aggregated from JIRA, GitHub, and Aha!.

**API Type:** RESTful API
**Data Format:** JSON
**Protocol:** HTTP/HTTPS

---

## Authentication

### Backend API (Go Server)

The backend API itself does not require authentication (suitable for internal use). However, it authenticates with external services using credentials from environment variables.

**External Service Authentication:**

1. **JIRA API** - Basic Authentication
   ```
   Authorization: Basic base64(email:api_token)
   ```

2. **GitHub API** - Personal Access Token
   ```
   Authorization: token YOUR_GITHUB_TOKEN
   ```

3. **Aha! API** - API Key
   ```
   Authorization: Bearer YOUR_AHA_API_KEY
   ```

### Next.js API Routes

Next.js API routes use server-side environment variables to authenticate with external services. No client-side authentication is required.

---

## Base URLs

**Development:**
- Backend: `http://localhost:8080`
- Frontend: `http://localhost:3000`

**Production:**
- Backend: `https://api.dashboard.company.com` (configure in deployment)
- Frontend: `https://dashboard.company.com` (configure in deployment)

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "count": 10,
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "statusCode": 400
}
```

### Dashboard Data Response

See [Dashboard Endpoint](#get-apidashboard) for detailed structure.

---

## JIRA API Endpoints

### GET /api/instances

Returns a list of configured JIRA instances.

**Query Parameters:** None

**Success Response (200 OK):**
```json
{
  "instances": [
    {
      "id": "primary",
      "name": "Company JIRA"
    },
    {
      "id": "secondary",
      "name": "Acquired Team JIRA"
    }
  ],
  "count": 2
}
```

**Example Request:**
```bash
curl http://localhost:8080/api/instances
```

---

### GET /api/projects

Returns a list of all accessible JIRA projects.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | string | No | Instance ID (default: primary) |

**Success Response (200 OK):**
```json
{
  "projects": [
    {
      "key": "PROJ",
      "name": "Project Name",
      "description": "Project description",
      "lead": "John Doe"
    }
  ],
  "count": 1
}
```

**Example Request:**
```bash
curl "http://localhost:8080/api/projects?instance=primary"
```

---

### GET /api/sprints

Returns a list of sprints for a specific project.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project` | string | Yes | Project key (e.g., "PROJ") |
| `instance` | string | No | Instance ID (default: primary) |

**Success Response (200 OK):**
```json
{
  "sprints": [
    {
      "id": 123,
      "name": "Sprint 45",
      "state": "active",
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-11-14T23:59:59Z",
      "completeDate": null,
      "originBoardId": 10
    }
  ],
  "count": 1
}
```

**Example Request:**
```bash
curl "http://localhost:8080/api/sprints?project=PROJ&instance=primary"
```

---

### GET /api/dashboard

**Primary endpoint** - Returns comprehensive dashboard data including issues, analytics, and team performance metrics.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project` | string | Yes | Project key (e.g., "PROJ") |
| `sprint` | string | No | Sprint ID (omit for all sprints) |
| `instance` | string | No | Instance ID (default: primary) |

**Success Response (200 OK):**
```json
{
  "jiraBaseURL": "https://company.atlassian.net",
  "sprintInfo": {
    "id": 123,
    "name": "Sprint 45",
    "state": "active",
    "startDate": "2025-11-01T00:00:00Z",
    "endDate": "2025-11-14T23:59:59Z"
  },
  "issues": [
    {
      "key": "PROJ-123",
      "summary": "Implement user authentication",
      "description": "Add OAuth2 authentication...",
      "status": "Done",
      "priority": "High",
      "issueType": "Story",
      "assignee": "John Doe",
      "reporter": "Jane Smith",
      "created": "2025-11-01T10:00:00Z",
      "updated": "2025-11-10T15:30:00Z",
      "resolved": "2025-11-10T15:30:00Z",
      "dueDate": "2025-11-14T00:00:00Z",
      "storyPoints": 5,
      "sprint": "Sprint 45",
      "labels": ["backend", "security"],
      "components": ["Authentication"],
      "developmentTimeDays": 3.5,
      "inProgressToQADays": 1.2,
      "statusHistory": [
        {
          "status": "To Do",
          "timestamp": "2025-11-01T10:00:00Z"
        },
        {
          "status": "In Progress",
          "timestamp": "2025-11-05T09:00:00Z"
        },
        {
          "status": "In QA",
          "timestamp": "2025-11-08T14:00:00Z"
        },
        {
          "status": "Done",
          "timestamp": "2025-11-10T15:30:00Z"
        }
      ],
      "ahaFeature": {
        "id": "FEAT-123",
        "name": "User Authentication",
        "verified": true,
        "url": "https://company.aha.io/features/FEAT-123"
      }
    }
  ],
  "summary": {
    "totalIssues": 50,
    "completedIssues": 45,
    "inProgressIssues": 3,
    "todoIssues": 2,
    "completionRate": 90.0,
    "totalStoryPoints": 150,
    "completedStoryPoints": 135,
    "averageDevTime": 4.2,
    "bugCount": 5,
    "storyCount": 40,
    "taskCount": 5
  },
  "developerMetrics": [
    {
      "developer": "John Doe",
      "totalIssues": 12,
      "completedIssues": 11,
      "storyPointsCompleted": 35,
      "averageDevTime": 3.8,
      "completionRate": 91.7,
      "qualityScore": 95.0,
      "recoveryRate": 100.0,
      "rating": 4.5,
      "sprintBreakdown": [
        {
          "sprint": "Sprint 44",
          "issuesCompleted": 5,
          "storyPoints": 15,
          "avgDevTime": 3.5
        },
        {
          "sprint": "Sprint 45",
          "issuesCompleted": 6,
          "storyPoints": 20,
          "avgDevTime": 4.0
        }
      ]
    }
  ],
  "statusDistribution": {
    "Done": 45,
    "In Progress": 3,
    "To Do": 2
  },
  "priorityDistribution": {
    "High": 10,
    "Medium": 30,
    "Low": 10
  },
  "typeDistribution": {
    "Story": 40,
    "Bug": 5,
    "Task": 5
  }
}
```

**Example Request:**
```bash
curl "http://localhost:8080/api/dashboard?project=PROJ&sprint=123&instance=primary"
```

**Performance Notes:**
- This endpoint fetches issue changelogs concurrently (up to 10 simultaneous requests)
- Response time for 50 issues: ~3-5 seconds
- Response time for 100 issues: ~5-8 seconds

---

### GET /api/project/{projectKey}

Returns detailed information about a specific project.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | Yes | Project key (e.g., "PROJ") |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | string | No | Instance ID (default: primary) |

**Success Response (200 OK):**
```json
{
  "project": "PROJ",
  "issues": [ ... ],
  "count": 150
}
```

**Example Request:**
```bash
curl "http://localhost:8080/api/project/PROJ?instance=primary"
```

---

### GET /api/sprint/{sprintId}

Returns detailed information about a specific sprint.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sprintId` | integer | Yes | Sprint ID |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | string | No | Instance ID (default: primary) |

**Success Response (200 OK):**
```json
{
  "sprintId": 123,
  "issues": [ ... ],
  "analytics": {
    "summary": { ... },
    "developerMetrics": [ ... ]
  }
}
```

**Example Request:**
```bash
curl "http://localhost:8080/api/sprint/123?instance=primary"
```

---

### GET /api/issue/{issueKey}

Returns the changelog (status history) for a specific issue.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issueKey` | string | Yes | Issue key (e.g., "PROJ-123") |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | string | No | Instance ID (default: primary) |

**Success Response (200 OK):**
```json
{
  "issueKey": "PROJ-123",
  "statusHistory": [
    {
      "status": "To Do",
      "timestamp": "2025-11-01T10:00:00Z"
    },
    {
      "status": "In Progress",
      "timestamp": "2025-11-05T09:00:00Z"
    },
    {
      "status": "Done",
      "timestamp": "2025-11-10T15:30:00Z"
    }
  ],
  "inProgressToQADays": 1.2,
  "developmentTimeDays": 3.5
}
```

**Example Request:**
```bash
curl "http://localhost:8080/api/issue/PROJ-123?instance=primary"
```

---

### GET /api/search

Searches JIRA using a custom JQL query.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jql` | string | Yes | JQL query string |
| `instance` | string | No | Instance ID (default: primary) |

**Success Response (200 OK):**
```json
{
  "jql": "project = PROJ AND status = Done",
  "issues": [ ... ],
  "count": 45
}
```

**Example Request:**
```bash
curl "http://localhost:8080/api/search?jql=project%3DPROJ%20AND%20status%3DDone&instance=primary"
```

**JQL Examples:**
```
# All issues in a project
project = PROJ

# Issues assigned to a user
assignee = "john.doe@company.com"

# Issues in a specific sprint
Sprint = 123

# High priority bugs
priority = High AND type = Bug

# Recently updated issues
updated >= -7d

# Complex query
project = PROJ AND status != Done AND assignee = currentUser() ORDER BY priority DESC
```

---

### GET /api/test-connection

Tests the connection to a JIRA instance.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instance` | string | No | Instance ID (default: primary) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully connected to JIRA"
}
```

**Error Response (503 Service Unavailable):**
```json
{
  "success": false,
  "error": "authentication failed: invalid credentials"
}
```

**Example Request:**
```bash
curl "http://localhost:8080/api/test-connection?instance=primary"
```

---

## GitHub API Endpoints

### GET /api/github/status

Returns the connection status for GitHub integration.

**Query Parameters:** None

**Success Response (200 OK):**
```json
{
  "enabled": true,
  "connected": true,
  "repos": ["repo1", "repo2"]
}
```

**Example Request:**
```bash
curl http://localhost:8080/api/github/status
```

---

### GET /api/github/repos

Returns a list of configured GitHub repositories.

**Query Parameters:** None

**Success Response (200 OK):**
```json
{
  "repos": [
    {
      "name": "backend-api",
      "owner": "company",
      "fullName": "company/backend-api",
      "private": true,
      "defaultBranch": "main"
    }
  ],
  "count": 1
}
```

**Example Request:**
```bash
curl http://localhost:8080/api/github/repos
```

---

### GET /api/github/stats

Returns repository statistics.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repo` | string | Yes | Repository name |

**Success Response (200 OK):**
```json
{
  "repo": "backend-api",
  "stats": {
    "totalCommits": 1250,
    "totalPRs": 320,
    "openPRs": 12,
    "closedPRs": 308,
    "contributors": 15,
    "languages": {
      "Go": 85.2,
      "JavaScript": 10.5,
      "Other": 4.3
    }
  }
}
```

**Example Request:**
```bash
curl "http://localhost:8080/api/github/stats?repo=backend-api"
```

---

### GET /api/github/prs

Returns pull request data for a repository.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repo` | string | Yes | Repository name |
| `state` | string | No | PR state: "open", "closed", "all" (default: "all") |

**Success Response (200 OK):**
```json
{
  "repo": "backend-api",
  "pullRequests": [
    {
      "number": 456,
      "title": "Add authentication middleware",
      "author": "john.doe",
      "state": "open",
      "created": "2025-11-10T10:00:00Z",
      "updated": "2025-11-12T15:30:00Z",
      "merged": null,
      "reviewers": ["jane.smith", "bob.jones"],
      "labels": ["enhancement", "backend"]
    }
  ],
  "count": 1
}
```

**Example Request:**
```bash
curl "http://localhost:8080/api/github/prs?repo=backend-api&state=open"
```

---

### GET /api/github/commits

Returns commit history for a repository.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repo` | string | Yes | Repository name |
| `since` | string | No | ISO 8601 date (default: 30 days ago) |

**Success Response (200 OK):**
```json
{
  "repo": "backend-api",
  "commits": [
    {
      "sha": "abc123def456",
      "message": "Fix authentication bug",
      "author": "john.doe",
      "date": "2025-11-12T14:30:00Z",
      "url": "https://github.com/company/backend-api/commit/abc123def456"
    }
  ],
  "count": 50
}
```

**Example Request:**
```bash
curl "http://localhost:8080/api/github/commits?repo=backend-api&since=2025-11-01T00:00:00Z"
```

---

### GET /api/github/developer-activity

Returns developer activity metrics across repositories.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repo` | string | No | Repository name (omit for all repos) |

**Success Response (200 OK):**
```json
{
  "developers": [
    {
      "name": "john.doe",
      "commits": 45,
      "prsCreated": 12,
      "prsReviewed": 20,
      "linesAdded": 2500,
      "linesDeleted": 800,
      "repositories": ["backend-api", "frontend-app"]
    }
  ],
  "count": 10
}
```

**Example Request:**
```bash
curl "http://localhost:8080/api/github/developer-activity?repo=backend-api"
```

---

## Aha! API Endpoints

### POST /api/aha/verify

Verifies Aha! feature links for JIRA issues.

**Request Body:**
```json
{
  "issueKeys": ["PROJ-123", "PROJ-456", "PROJ-789"]
}
```

**Success Response (200 OK):**
```json
{
  "verified": [
    {
      "issueKey": "PROJ-123",
      "ahaFeature": {
        "id": "FEAT-123",
        "name": "User Authentication",
        "verified": true,
        "url": "https://company.aha.io/features/FEAT-123"
      }
    }
  ],
  "notFound": ["PROJ-456"],
  "errors": ["PROJ-789"]
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8080/api/aha/verify \
  -H "Content-Type: application/json" \
  -d '{"issueKeys": ["PROJ-123", "PROJ-456"]}'
```

---

### GET /api/aha/test-connection

Tests the connection to Aha!.

**Query Parameters:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully connected to Aha!"
}
```

**Error Response (503 Service Unavailable):**
```json
{
  "success": false,
  "error": "authentication failed: invalid API key"
}
```

**Example Request:**
```bash
curl http://localhost:8080/api/aha/test-connection
```

---

## Next.js API Routes

These routes are hosted by the Next.js frontend server and provide AI-powered features.

### POST /api/chat

AI chat interface for asking questions about dashboard data.

**Base URL:** `http://localhost:3000` (frontend)

**Request Body:**
```json
{
  "message": "What are the top 3 developers this sprint?",
  "history": [
    { "role": "user", "content": "Previous question" },
    { "role": "assistant", "content": "Previous answer" }
  ],
  "context": {
    "project": "PROJ",
    "sprint": "Sprint 45",
    "dashboardData": { ... }
  }
}
```

**Success Response (200 OK):**
```json
{
  "response": "Based on the current sprint data, the top 3 developers are:\n1. John Doe - 35 story points, 4.5 rating\n2. Jane Smith - 30 story points, 4.3 rating\n3. Bob Jones - 28 story points, 4.2 rating",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the top 3 developers this sprint?",
    "context": {"project": "PROJ", "sprint": "Sprint 45"}
  }'
```

---

### POST /api/generate-release-notes

Generates AI-powered release notes from sprint tickets.

**Base URL:** `http://localhost:3000` (frontend)

**Request Body:**
```json
{
  "issues": [
    {
      "key": "PROJ-123",
      "summary": "Implement user authentication",
      "issueType": "Story",
      "status": "Done"
    }
  ],
  "sprint": {
    "name": "Sprint 45",
    "startDate": "2025-11-01T00:00:00Z",
    "endDate": "2025-11-14T23:59:59Z"
  }
}
```

**Success Response (200 OK):**
```json
{
  "releaseNotes": "# Release Notes - Sprint 45\n\n## Features\n- **User Authentication** (PROJ-123): Added OAuth2 authentication...\n\n## Bug Fixes\n...",
  "generatedAt": "2025-11-15T10:30:00Z"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/generate-release-notes \
  -H "Content-Type: application/json" \
  -d '{
    "issues": [...],
    "sprint": {"name": "Sprint 45"}
  }'
```

---

### POST /api/generate-sprint-analysis

Generates AI-powered sprint analysis and insights.

**Base URL:** `http://localhost:3000` (frontend)

**Request Body:**
```json
{
  "metrics": {
    "completionRate": 90.0,
    "averageDevTime": 4.2,
    "totalStoryPoints": 150,
    "developerMetrics": [ ... ]
  },
  "sprint": {
    "name": "Sprint 45",
    "state": "closed"
  }
}
```

**Success Response (200 OK):**
```json
{
  "analysis": "# Sprint 45 Analysis\n\n## Overall Performance\nThe team completed 90% of planned work...\n\n## Key Insights\n- High completion rate indicates good sprint planning...",
  "generatedAt": "2025-11-15T10:30:00Z"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/generate-sprint-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": {...},
    "sprint": {"name": "Sprint 45"}
  }'
```

---

## Error Handling

### HTTP Status Codes

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid parameters or missing required fields |
| 401 | Unauthorized | Authentication failed with external service |
| 404 | Not Found | Resource not found |
| 405 | Method Not Allowed | HTTP method not supported for this endpoint |
| 500 | Internal Server Error | Server-side error occurred |
| 503 | Service Unavailable | External service (JIRA, GitHub, Aha!) unavailable |

### Error Response Format

```json
{
  "success": false,
  "error": "Detailed error message",
  "statusCode": 400
}
```

### Common Errors

**Invalid JIRA Instance:**
```json
{
  "error": "instance 'invalid' not found"
}
```

**Missing Required Parameter:**
```json
{
  "error": "project parameter is required"
}
```

**JIRA API Error:**
```json
{
  "error": "JIRA API error: 401 - Authentication failed"
}
```

**Connection Timeout:**
```json
{
  "error": "error making request: context deadline exceeded"
}
```

---

## Rate Limiting

### JIRA API Rate Limits

**Atlassian Cloud:**
- 10 requests per second per IP address
- Exceeding this may result in 429 Too Many Requests errors

**Dashboard Implementation:**
- Uses semaphore-based concurrency limiting
- Maximum 10 concurrent requests to JIRA API
- Prevents rate limit violations

### GitHub API Rate Limits

**Authenticated Requests:**
- 5,000 requests per hour per user
- Rate limit status included in response headers

**Dashboard Implementation:**
- Fetches data on-demand
- Implements client-side caching
- Displays rate limit warnings

### Anthropic API Rate Limits

**Claude API:**
- Varies by plan (check Anthropic Console)
- Typical: 50 requests per minute

**Dashboard Implementation:**
- AI features are user-initiated
- Rate limiting handled by Anthropic API
- Errors displayed to user with retry option

---

## API Client Examples

### JavaScript/TypeScript

```typescript
// Fetch dashboard data
const fetchDashboard = async (project: string, sprint: string) => {
  const response = await fetch(
    `http://localhost:8080/api/dashboard?project=${project}&sprint=${sprint}`
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

// Generate release notes
const generateReleaseNotes = async (issues, sprint) => {
  const response = await fetch('http://localhost:3000/api/generate-release-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issues, sprint })
  });

  const data = await response.json();
  return data.releaseNotes;
};
```

### Python

```python
import requests

# Fetch dashboard data
def fetch_dashboard(project, sprint):
    response = requests.get(
        f'http://localhost:8080/api/dashboard',
        params={'project': project, 'sprint': sprint}
    )
    response.raise_for_status()
    return response.json()

# Search JIRA
def search_jira(jql):
    response = requests.get(
        f'http://localhost:8080/api/search',
        params={'jql': jql}
    )
    response.raise_for_status()
    return response.json()['issues']
```

### cURL

```bash
# Fetch dashboard data
curl "http://localhost:8080/api/dashboard?project=PROJ&sprint=123"

# Search JIRA with JQL
curl "http://localhost:8080/api/search?jql=project%3DPROJ%20AND%20status%3DDone"

# Test JIRA connection
curl "http://localhost:8080/api/test-connection?instance=primary"

# Generate release notes
curl -X POST http://localhost:3000/api/generate-release-notes \
  -H "Content-Type: application/json" \
  -d '{"issues": [...], "sprint": {...}}'
```

---

## API Versioning

**Current Version:** v1 (implicit)

Future API versions will be prefixed with `/api/v2`, `/api/v3`, etc.

---

## Support and Feedback

For API issues or questions:
1. Check the [Troubleshooting Guide](README.md#troubleshooting)
2. Review the [Architecture Documentation](ARCHITECTURE.md)
3. Contact the development team

---

**Last Updated:** November 2025
**API Version:** 1.0
**Maintainer:** Development Team
