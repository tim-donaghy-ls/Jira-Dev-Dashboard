# HTTP API Documentation

## Overview

The HTTP API provides RESTful endpoints for accessing JIRA dashboard data, GitHub statistics, and Aha verification.

**Package:** `jira-dashboard/api`
**Location:** [backend/api/](../../backend/api/)
**Base URL:** `http://localhost:8080` (configurable via `SERVER_PORT` env var)

---

## API Endpoints

### JIRA Endpoints

#### GET /api/instances

Returns the list of configured JIRA instances.

**Query Parameters:** None

**Response:**
```json
{
  "instances": [
    {
      "id": "primary",
      "name": "Primary Instance"
    }
  ],
  "count": 1
}
```

---

#### GET /api/test-connection

Tests the connection to a JIRA instance.

**Query Parameters:**
- `instance` (optional) - Instance ID (defaults to primary)

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully connected to JIRA"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Connection error message"
}
```

**Status Codes:**
- `200` - Connection successful
- `503` - Connection failed

---

#### GET /api/projects

Retrieves all accessible JIRA projects.

**Query Parameters:**
- `instance` (optional) - Instance ID

**Response:**
```json
{
  "projects": [
    {
      "id": "10000",
      "key": "MYPROJ",
      "name": "My Project"
    }
  ],
  "count": 1
}
```

---

#### GET /api/sprints

Retrieves all sprints for a project.

**Query Parameters:**
- `instance` (optional) - Instance ID
- `project` (required) - Project key

**Response:**
```json
{
  "sprints": [
    {
      "id": 123,
      "name": "Sprint 23",
      "state": "active",
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-01-15T00:00:00Z"
    }
  ],
  "count": 1
}
```

---

#### GET /api/dashboard

Retrieves comprehensive dashboard data with analytics.

**Query Parameters:**
- `instance` (optional) - Instance ID
- `project` (required) - Project key
- `sprint` (optional) - Sprint ID or "all"

**Response:**
```json
{
  "jiraBaseUrl": "https://mycompany.atlassian.net",
  "sprintInfo": {
    "id": 123,
    "name": "Sprint 23",
    "state": "active"
  },
  "summary": {
    "totalIssues": 45,
    "openIssues": 15,
    "closedIssues": 30,
    "totalStoryPoints": 123.5,
    "avgResolutionDays": 3.2
  },
  "statusBreakdown": {
    "Done": 25,
    "In Progress": 10,
    "To Do": 5
  },
  "priorityBreakdown": {
    "High": 15,
    "Medium": 20,
    "Low": 10
  },
  "assigneeStats": [
    {
      "name": "John Doe",
      "totalIssues": 15,
      "closedIssues": 10,
      "totalStoryPoints": 45.0,
      "avgDevelopmentTimeDays": 2.5
    }
  ],
  "allIssues": [ /* array of all issues */ ],
  "recentIssues": [ /* array of recent issues */ ]
}
```

**Notes:**
- Enriches issues with status history and calculated metrics
- Uses parallel processing for performance (max 10 concurrent requests)
- Fetches changelog for each issue to calculate development metrics

---

#### GET /api/issue/{issueKey}

Retrieves changelog and metrics for a specific issue.

**Path Parameters:**
- `issueKey` - JIRA issue key (e.g., "PROJ-123")

**Query Parameters:**
- `instance` (optional) - Instance ID

**Response:**
```json
{
  "issueKey": "PROJ-123",
  "statusHistory": [
    {
      "status": "In Progress",
      "fromStatus": "To Do",
      "timestamp": "2025-01-01T10:00:00Z"
    }
  ],
  "inProgressToQADays": 1.5,
  "developmentTimeDays": 3.2
}
```

---

#### GET /api/search

Searches JIRA issues using JQL (JIRA Query Language).

**Query Parameters:**
- `instance` (optional) - Instance ID
- `jql` (required) - JQL query string

**Example:**
```
GET /api/search?jql=project%20%3D%20MYPROJ%20AND%20status%20%3D%20%22In%20Progress%22
```

**Response:**
```json
{
  "jql": "project = MYPROJ AND status = \"In Progress\"",
  "issues": [ /* array of matching issues */ ],
  "count": 10
}
```

---

### GitHub Endpoints

#### GET /api/github/status

Tests GitHub API connection and returns repository status.

**Query Parameters:** None

**Response:**
```json
{
  "enabled": true,
  "owner": "myorg",
  "repos": ["repo1", "repo2"],
  "repoStatus": {
    "repo1": { "connected": true },
    "repo2": { "connected": false, "error": "Repository not found" }
  }
}
```

---

#### GET /api/github/repos

Returns the list of configured GitHub repositories.

**Query Parameters:** None

**Response:**
```json
{
  "repos": [
    {
      "name": "myrepo",
      "owner": "myorg",
      "url": "https://github.com/myorg/myrepo"
    }
  ],
  "count": 1
}
```

---

#### GET /api/github/stats

Retrieves GitHub developer contribution statistics.

**Query Parameters:**
- `repo` (optional) - Repository name (aggregates all repos if not specified)
- `days` (optional) - Number of days to look back (default: 30)

**Response:**
```json
{
  "developers": {
    "johndoe": {
      "username": "johndoe",
      "totalCommits": 45,
      "totalPRs": 12,
      "mergedPRs": 10,
      "openPRs": 2,
      "additions": 1234,
      "deletions": 567,
      "lastCommitDate": "2025-01-15T10:00:00Z",
      "testCoverage": 35.5
    }
  },
  "startDate": "2024-12-15T00:00:00Z",
  "endDate": "2025-01-15T00:00:00Z"
}
```

---

#### GET /api/github/prs

Fetches pull requests from GitHub repositories.

**Query Parameters:**
- `repo` (optional) - Repository name (queries all repos if not specified)
- `state` (optional) - PR state: "open", "closed", or "all" (default: "all")
- `days` (optional) - Number of days to look back (default: 30)

**Response:**
```json
{
  "prs": [
    {
      "number": 42,
      "title": "Add new feature",
      "state": "open",
      "user": { "login": "johndoe" },
      "createdAt": "2025-01-10T10:00:00Z",
      "additions": 123,
      "deletions": 45
    }
  ],
  "count": 1
}
```

---

#### GET /api/github/commits

Fetches commits from GitHub repositories.

**Query Parameters:**
- `repo` (optional) - Repository name (queries all repos if not specified)
- `author` (optional) - Filter by commit author username
- `days` (optional) - Number of days to look back (default: 7)

**Response:**
```json
{
  "commits": [
    {
      "sha": "a1b2c3d4...",
      "commit": {
        "message": "Fix bug in authentication",
        "author": {
          "name": "John Doe",
          "email": "john@example.com",
          "date": "2025-01-15T10:00:00Z"
        }
      },
      "author": { "login": "johndoe" }
    }
  ],
  "count": 1
}
```

---

#### GET /api/github/developer-activity

Retrieves aggregated developer activity across all repositories.

**Query Parameters:**
- `start` (required) - Start date (ISO 8601 format)
- `end` (required) - End date (ISO 8601 format)

**Response:**
```json
{
  "developerActivity": {
    "johndoe": {
      "username": "johndoe",
      "commits": 45,
      "prs": 12,
      "prsMerged": 10,
      "additions": 1234,
      "deletions": 567,
      "lastActivity": "2025-01-15T10:00:00Z"
    }
  },
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-15T00:00:00Z",
  "repos": ["repo1", "repo2"]
}
```

---

### Aha Endpoints

#### GET /api/aha/test-connection

Tests the connection to Aha API.

**Query Parameters:** None

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully connected to Aha"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Connection error"
}
```

**Status Codes:**
- `200` - Connection successful
- `503` - Aha not configured or connection failed

---

#### POST /api/aha/verify

Verifies if JIRA tickets exist in Aha.

**Request Body:**
```json
{
  "jiraKeys": ["PROJ-123", "PROJ-456"]
}
```

**Response:**
```json
[
  {
    "jiraKey": "PROJ-123",
    "existsInAha": true,
    "ahaReference": "APP-1234",
    "ahaUrl": "https://mycompany.aha.io/features/APP-1234",
    "ahaStatus": "Ready to develop"
  },
  {
    "jiraKey": "PROJ-456",
    "existsInAha": false
  }
]
```

**Status Codes:**
- `200` - Verification completed
- `503` - Aha not configured

---

## CORS Configuration

All endpoints support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

---

## Error Responses

All endpoints return errors in the following format:

**Status Codes:**
- `400` - Bad Request (missing or invalid parameters)
- `405` - Method Not Allowed
- `500` - Internal Server Error
- `503` - Service Unavailable (external service not configured or unreachable)

**Error Response:**
```json
{
  "error": "Error message describing the issue"
}
```

---

## Authentication

The API currently does not require authentication for requests. Authentication is handled at the backend level when connecting to external services (JIRA, GitHub, Aha).

---

## Rate Limiting

No rate limiting is currently implemented on the API endpoints.

---

## Notes

- All timestamps are returned in RFC3339 format (ISO 8601)
- All endpoints return JSON responses with `Content-Type: application/json`
- Query parameters should be URL-encoded
- The `/api/dashboard` endpoint may take several seconds for large datasets due to parallel changelog fetching
- GitHub endpoints require GitHub configuration in environment variables
- Aha endpoints require Aha configuration in environment variables
