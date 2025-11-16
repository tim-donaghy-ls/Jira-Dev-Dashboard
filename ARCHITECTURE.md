# JIRA Dev Dashboard - Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Design](#architecture-design)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Data Flow](#data-flow)
6. [API Endpoints](#api-endpoints)
7. [Key Design Decisions](#key-design-decisions)
8. [Security Considerations](#security-considerations)

---

## System Overview

The JIRA Dev Dashboard is a full-stack web application that provides real-time analytics and insights into team performance, sprint metrics, and developer productivity using data from JIRA, GitHub, and Aha!.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│                    (http://localhost:3000)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Next.js Frontend (React)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages &    │  │  Components  │  │   Context    │      │
│  │   Routing    │  │     (UI)     │  │   Providers  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/JSON API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Go Backend Server                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Handlers│  │   Analysis   │  │   Clients    │      │
│  │   (Routes)   │  │    Engine    │  │ (JIRA/GitHub)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API Calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              External Services                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ JIRA Cloud   │  │ GitHub API   │  │   Aha! API   │      │
│  │   (Primary/  │  │              │  │              │      │
│  │  Secondary)  │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Backend:**
- Language: Go 1.16+
- HTTP Server: Standard library `net/http`
- Architecture: RESTful API
- Configuration: Environment variables

**Frontend:**
- Framework: Next.js 16.0.1 (App Router)
- UI Library: React 19.2.0
- Styling: Tailwind CSS 3.4.1
- Language: TypeScript 5
- State Management: React Context + Hooks
- Excel Export: SheetJS (xlsx) 0.18.5
- AI Integration: Anthropic Claude API

---

## Architecture Design

### Design Principles

1. **Separation of Concerns**: Clear separation between frontend (UI/UX) and backend (business logic)
2. **Multi-Instance Support**: Ability to connect to multiple JIRA instances simultaneously
3. **Performance Optimization**: Concurrent data fetching with goroutines and request batching
4. **Type Safety**: Full TypeScript implementation in frontend
5. **Modularity**: Component-based architecture for reusability

### Component Layers

```
┌─────────────────────────────────────────────────────┐
│              Presentation Layer                      │
│  (React Components, UI, User Interactions)          │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│           Application Layer                          │
│  (API Routes, State Management, Hooks)              │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              Business Logic Layer                    │
│  (API Handlers, Analysis Engine, Calculations)      │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              Data Access Layer                       │
│  (JIRA Client, GitHub Client, Aha! Client)         │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              External Services                       │
│  (JIRA API, GitHub API, Aha! API)                  │
└─────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### Directory Structure

```
backend/
├── main.go                    # Application entry point, server setup
├── config/
│   ├── config.go             # Configuration loading and validation
│   └── config_test.go        # Configuration tests
├── api/
│   ├── handlers.go           # Main API route handlers
│   ├── github_handlers.go    # GitHub-specific handlers
│   ├── aha_handlers.go       # Aha!-specific handlers
│   ├── test_handler.go       # Test endpoint handlers
│   └── handlers_test.go      # API handler tests
├── jira/
│   ├── client.go             # JIRA API client
│   ├── models.go             # JIRA data models
│   ├── client_test.go        # Client tests
│   └── models_test.go        # Model tests
├── github/
│   └── client.go             # GitHub API client
├── aha/
│   └── client.go             # Aha! API client
└── analysis/
    ├── analyzer.go           # Data analysis and metrics calculation
    └── analyzer_test.go      # Analyzer tests
```

### Core Components

#### 1. Main Application ([main.go:1](../JIRA-Dev-Dashboard/backend/main.go#L1))

**Responsibilities:**
- Load configuration from environment variables
- Initialize JIRA, GitHub, and Aha! clients
- Test connections to all external services
- Set up HTTP routes and middleware
- Start the HTTP server

**Key Functions:**
- `main()` - Application entry point
- `loggingMiddleware()` - Logs all HTTP requests
- `corsMiddleware()` - Enables CORS for cross-origin requests

#### 2. Configuration Management ([config/config.go](../JIRA-Dev-Dashboard/backend/config/config.go))

**Responsibilities:**
- Load environment variables from `.env` file
- Validate required configuration
- Support multiple JIRA instances (primary/secondary)
- Configure GitHub integration
- Configure Aha! integration

**Data Structures:**
```go
type Config struct {
    ServerPort string
    Instances  map[string]*JiraInstance  // Supports multiple JIRA instances
    GitHub     *GitHubConfig
    Aha        *AhaConfig
}

type JiraInstance struct {
    Name     string
    BaseURL  string
    Email    string
    Token    string
}
```

#### 3. API Handlers ([api/handlers.go:1](../JIRA-Dev-Dashboard/backend/api/handlers.go#L1))

**Responsibilities:**
- Define all HTTP endpoints
- Handle HTTP request/response cycle
- Orchestrate data fetching from multiple sources
- Aggregate and analyze data
- Return JSON responses

**Key Methods:**
- `RegisterRoutes()` - Registers all API endpoints
- `handleDashboard()` - Main dashboard data endpoint
- `handleProjects()` - List all accessible projects
- `handleSprints()` - List sprints for a project
- `handleInstances()` - List available JIRA instances

#### 4. JIRA Client ([jira/client.go:1](../JIRA-Dev-Dashboard/backend/jira/client.go#L1))

**Responsibilities:**
- Authenticate with JIRA API (Basic Auth)
- Fetch issues using JQL queries
- Retrieve project and sprint information
- Get issue changelog and status history
- Calculate development metrics

**Key Methods:**
```go
// Core API methods
func (c *Client) SearchIssues(jql string, maxResults int) ([]Issue, error)
func (c *Client) GetIssuesByProject(projectKey string) ([]Issue, error)
func (c *Client) GetIssuesBySprint(sprintID int) ([]Issue, error)
func (c *Client) GetProjects() ([]Project, error)
func (c *Client) GetSprintsByProject(projectKey string) ([]Sprint, error)
func (c *Client) GetIssueChangelog(issueKey string) ([]StatusChange, error)
func (c *Client) TestConnection() error

// Helper methods
func (c *Client) makeRequest(endpoint string) ([]byte, error)
```

#### 5. Analysis Engine ([analysis/analyzer.go](../JIRA-Dev-Dashboard/backend/analysis/analyzer.go))

**Responsibilities:**
- Aggregate metrics across all issues
- Calculate developer performance scores
- Compute sprint statistics
- Generate team performance rankings
- Analyze story points and completion rates

**Metrics Calculated:**
- Story points completed per developer
- Average completion rate
- Development time per issue
- Quality scores (bugs/total issues)
- Recovery rates
- Sprint velocity
- Status distribution

#### 6. GitHub Integration ([github/client.go](../JIRA-Dev-Dashboard/backend/github/client.go))

**Responsibilities:**
- Fetch repository statistics
- Get pull request data
- Retrieve commit history
- Track developer activity

#### 7. Aha! Integration ([aha/client.go](../JIRA-Dev-Dashboard/backend/aha/client.go))

**Responsibilities:**
- Verify feature references in JIRA tickets
- Cross-reference with product roadmap
- Validate feature links

### Concurrency and Performance

The backend uses Go's concurrency features for optimal performance:

```go
// Example from handlers.go:177-205
// Parallel issue enrichment with semaphore-based rate limiting
semaphore := make(chan struct{}, 10) // Limit to 10 concurrent requests
for i := range issues {
    go func(idx int) {
        semaphore <- struct{}{}        // Acquire semaphore
        defer func() { <-semaphore }() // Release semaphore

        // Fetch status history for this issue
        statusHistory, err := jiraClient.GetIssueChangelog(issues[idx].Key)
        // ... process and update issue
    }(i)
}
```

**Performance Optimizations:**
1. Concurrent issue changelog fetching (up to 10 simultaneous requests)
2. Semaphore-based rate limiting to prevent API throttling
3. HTTP client connection pooling with 30-second timeout
4. Efficient JSON encoding/decoding

---

## Frontend Architecture

### Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx               # Root layout with theme provider
│   ├── page.tsx                 # Main dashboard page
│   ├── globals.css              # Global styles
│   └── api/
│       ├── chat/
│       │   └── route.ts         # Claude AI chat endpoint
│       ├── generate-sprint-analysis/
│       │   └── route.ts         # Sprint analysis generation
│       └── generate-release-notes/
│           └── route.ts         # AI release notes generation
├── components/
│   ├── TeamPerformanceTable.tsx # Developer rankings & metrics
│   ├── SprintTicketsTable.tsx   # Sprint ticket display
│   ├── Controls.tsx             # Filter controls
│   ├── SummaryCards.tsx         # Metric summary cards
│   ├── StatusChart.tsx          # Status distribution chart
│   ├── PriorityChart.tsx        # Priority distribution chart
│   ├── DeveloperStoryPointsChart.tsx  # Developer metrics chart
│   ├── DeveloperDevTimeChart.tsx      # Development time chart
│   ├── DeveloperWorkload.tsx    # Workload visualization
│   ├── SprintSlippage.tsx       # Sprint slippage tracking
│   ├── ReleaseNotesModal.tsx    # AI release notes modal
│   ├── ChatDrawer.tsx           # AI chat interface
│   ├── ThemeToggle.tsx          # Dark/light mode toggle
│   ├── Header.tsx               # Application header
│   ├── UserMenu.tsx             # User menu component
│   ├── LoadingSpinner.tsx       # Loading indicator
│   ├── ErrorMessage.tsx         # Error display
│   └── ConnectionStatus.tsx     # Connection status indicator
├── context/
│   └── ThemeContext.tsx         # Theme state management
├── hooks/
│   └── useJiraData.ts           # JIRA data fetching hook
├── lib/
│   ├── utils.ts                 # Utility functions
│   └── api-client.ts            # API client wrapper
├── types/
│   └── index.ts                 # TypeScript type definitions
└── middleware.ts                # Next.js middleware
```

### Core Components

#### 1. Dashboard Page ([app/page.tsx](../JIRA-Dev-Dashboard/frontend/app/page.tsx))

**Responsibilities:**
- Main application entry point
- Orchestrate data fetching
- Manage filter state
- Render dashboard components
- Handle error and loading states

**Component Hierarchy:**
```
Dashboard (page.tsx)
├── Header
│   ├── ThemeToggle
│   └── UserMenu
├── Controls
│   ├── Instance Selector
│   ├── Project Selector
│   └── Sprint Selector
├── SummaryCards
├── Charts Section
│   ├── StatusChart
│   ├── PriorityChart
│   ├── DeveloperStoryPointsChart
│   ├── DeveloperDevTimeChart
│   ├── DeveloperWorkload
│   └── SprintSlippage
├── TeamPerformanceTable
└── SprintTicketsTable
    ├── ReleaseNotesModal
    └── ChatDrawer
```

#### 2. Team Performance Table ([components/TeamPerformanceTable.tsx](../JIRA-Dev-Dashboard/frontend/components/TeamPerformanceTable.tsx))

**Responsibilities:**
- Display developer performance metrics
- Calculate 5-star ratings based on weighted scoring
- Show expandable sprint-by-sprint metrics
- Export data to Excel
- Provide detailed tooltips with rating breakdowns

**Rating Calculation:**
```typescript
// 5-star rating based on weighted performance metrics
Story Points Completed: 30% weight
Completion Rate:        25% weight
Development Time:       20% weight
Quality Score:          15% weight
Recovery Rate:          10% weight
```

#### 3. Sprint Tickets Table ([components/SprintTicketsTable.tsx](../JIRA-Dev-Dashboard/frontend/components/SprintTicketsTable.tsx))

**Responsibilities:**
- Display all sprint tickets with details
- Implement filtering and sorting
- Export to Excel
- Generate AI-powered release notes
- Show Aha! feature verification badges

#### 4. Custom Hooks

**useJiraData Hook ([hooks/useJiraData.ts](../JIRA-Dev-Dashboard/frontend/hooks/useJiraData.ts)):**
```typescript
// Centralized data fetching logic
const useJiraData = (instance, project, sprint) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from backend API
  // Handle loading and error states
  // Return reactive data updates
}
```

#### 5. Theme Management ([context/ThemeContext.tsx](../JIRA-Dev-Dashboard/frontend/context/ThemeContext.tsx))

**Responsibilities:**
- Provide global theme state (dark/light mode)
- Persist theme preference to localStorage
- Apply theme classes to document root

#### 6. API Routes

**Release Notes Generation ([app/api/generate-release-notes/route.ts](../JIRA-Dev-Dashboard/frontend/app/api/generate-release-notes/route.ts)):**
- Server-side API route
- Calls Anthropic Claude API
- Generates AI-powered release notes from ticket data
- Formats output in professional markdown

**Chat Interface ([app/api/chat/route.ts](../JIRA-Dev-Dashboard/frontend/app/api/chat/route.ts)):**
- Streaming AI chat responses
- Context-aware responses about dashboard data
- Integration with Claude API

---

## Data Flow

### 1. Initial Page Load

```
User Navigates to Dashboard
         ↓
Dashboard Component Mounts
         ↓
useJiraData Hook Triggered
         ↓
Fetch Available JIRA Instances
GET /api/instances
         ↓
Fetch Available Projects
GET /api/projects?instance=primary
         ↓
Fetch Sprints for Selected Project
GET /api/sprints?instance=primary&project=PROJ
         ↓
Fetch Dashboard Data
GET /api/dashboard?instance=primary&project=PROJ&sprint=123
         ↓
Backend Fetches JIRA Issues (Concurrent)
├─ Issue 1 → Get Changelog
├─ Issue 2 → Get Changelog
├─ Issue 3 → Get Changelog
└─ ... (up to 10 concurrent)
         ↓
Analysis Engine Processes Data
├─ Calculate Developer Metrics
├─ Aggregate Story Points
├─ Compute Ratings
└─ Generate Statistics
         ↓
Return JSON to Frontend
         ↓
React Components Update with Data
```

### 2. Filter Change Flow

```
User Changes Sprint Selection
         ↓
Controls Component Updates State
         ↓
useJiraData Hook Detects Change
         ↓
Re-fetch Dashboard Data
GET /api/dashboard?instance=primary&project=PROJ&sprint=456
         ↓
Backend Processes New Sprint Data
         ↓
Components Re-render with New Data
```

### 3. Export to Excel Flow

```
User Clicks "Export to Excel"
         ↓
TeamPerformanceTable.exportToExcel()
         ↓
Create Workbook (xlsx library)
├─ Sheet 1: Team Summary
├─ Sheet 2: Developer Metrics
└─ Sheet 3: Sprint Breakdown
         ↓
Generate Excel File (client-side)
         ↓
Trigger Download
```

### 4. AI Release Notes Flow

```
User Clicks "Generate Release Notes"
         ↓
ReleaseNotesModal Opens
         ↓
POST /api/generate-release-notes
Body: { issues: [...], sprint: {...} }
         ↓
Next.js API Route Handler
         ↓
Call Anthropic Claude API
         ↓
AI Generates Release Notes
         ↓
Return Markdown to Frontend
         ↓
Display in Modal with Copy Button
```

---

## API Endpoints

### JIRA Endpoints

| Endpoint | Method | Description | Query Parameters |
|----------|--------|-------------|------------------|
| `/api/instances` | GET | List available JIRA instances | None |
| `/api/projects` | GET | List all projects | `instance` (optional) |
| `/api/sprints` | GET | List sprints for a project | `instance`, `project` |
| `/api/dashboard` | GET | Get dashboard data | `instance`, `project`, `sprint` |
| `/api/project/{key}` | GET | Get project details | `instance` |
| `/api/sprint/{id}` | GET | Get sprint details | `instance` |
| `/api/issue/{key}` | GET | Get issue changelog | `instance` |
| `/api/search` | GET | Search JIRA with JQL | `instance`, `jql` |
| `/api/test-connection` | GET | Test JIRA connection | `instance` |

### GitHub Endpoints

| Endpoint | Method | Description | Query Parameters |
|----------|--------|-------------|------------------|
| `/api/github/status` | GET | GitHub connection status | None |
| `/api/github/repos` | GET | List configured repositories | None |
| `/api/github/stats` | GET | Repository statistics | `repo` |
| `/api/github/prs` | GET | Pull request data | `repo`, `state` |
| `/api/github/commits` | GET | Commit history | `repo`, `since` |
| `/api/github/developer-activity` | GET | Developer activity metrics | `repo` |

### Aha! Endpoints

| Endpoint | Method | Description | Query Parameters |
|----------|--------|-------------|------------------|
| `/api/aha/verify` | POST | Verify Aha! feature links | Body: `{ issueKeys: [...] }` |
| `/api/aha/test-connection` | GET | Test Aha! connection | None |

### Next.js API Routes

| Endpoint | Method | Description | Request Body |
|----------|--------|-------------|--------------|
| `/api/chat` | POST | AI chat interface | `{ message, history }` |
| `/api/generate-release-notes` | POST | Generate release notes | `{ issues, sprint }` |
| `/api/generate-sprint-analysis` | POST | Generate sprint analysis | `{ metrics, sprint }` |

---

## Key Design Decisions

### 1. Why Go for the Backend?

**Rationale:**
- Excellent concurrency support via goroutines
- Fast compilation and execution
- Strong standard library for HTTP servers
- Statically typed for reliability
- Single binary deployment

**Benefits:**
- Efficient parallel processing of JIRA issue changelog fetching
- Low memory footprint
- Easy deployment (single executable)
- Type safety without runtime overhead

### 2. Why Next.js for the Frontend?

**Rationale:**
- Server-side rendering for faster initial loads
- Built-in API routes for AI integrations
- File-based routing
- Excellent developer experience
- Built-in TypeScript support

**Benefits:**
- SEO-friendly (though not critical for internal tool)
- API routes allow secure server-side API key usage
- Hot module replacement for fast development
- Optimized production builds

### 3. Multi-Instance JIRA Support

**Design Decision:**
Organizations often have multiple JIRA instances (e.g., different teams, acquired companies).

**Implementation:**
```go
// Configuration supports multiple instances
type Config struct {
    Instances map[string]*JiraInstance  // "primary", "secondary", etc.
}

// API allows specifying which instance to query
GET /api/dashboard?instance=primary&project=PROJ
GET /api/dashboard?instance=secondary&project=PROJ
```

**Benefits:**
- Centralized dashboard for multiple teams
- Easy switching between instances
- Unified analytics across organization

### 4. Concurrent Issue Processing

**Design Decision:**
Fetching changelog for each issue is slow (100+ issues = 100+ API calls).

**Implementation:**
```go
// Process issues concurrently with rate limiting
semaphore := make(chan struct{}, 10)  // Max 10 concurrent
for i := range issues {
    go func(idx int) {
        semaphore <- struct{}{}
        defer func() { <-semaphore }()
        // Fetch changelog and process
    }(i)
}
```

**Benefits:**
- Dashboard loads 5-10x faster
- Respects API rate limits
- Efficient resource usage

### 5. Client-Side Excel Export

**Design Decision:**
Export functionality is handled entirely in the browser using SheetJS.

**Rationale:**
- No backend load for exports
- Instant download, no waiting
- Works offline
- Reduces server costs

**Trade-offs:**
- Limited to browser memory (OK for typical datasets)
- All data must be loaded in frontend first

### 6. 5-Star Rating System

**Design Decision:**
Use weighted scoring across multiple metrics for developer performance.

**Calculation:**
```typescript
const rating =
  (storyPoints * 0.30) +
  (completionRate * 0.25) +
  (devTime * 0.20) +
  (qualityScore * 0.15) +
  (recoveryRate * 0.10);
```

**Rationale:**
- Story points are most important (30%)
- Completion rate shows reliability (25%)
- Development time shows efficiency (20%)
- Quality score shows code quality (15%)
- Recovery rate shows resilience (10%)

### 7. AI Integration via Server-Side API Routes

**Design Decision:**
AI features (release notes, chat) use Next.js API routes, not client-side calls.

**Rationale:**
- API keys never exposed to browser
- Can implement rate limiting
- Can add authentication/authorization
- Centralized logging

**Implementation:**
```typescript
// app/api/generate-release-notes/route.ts (server-side)
export async function POST(request: Request) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY  // Safe!
  });
  // ... call AI API
}
```

---

## Security Considerations

### 1. API Authentication

**JIRA API:**
- Uses Basic Authentication (email + API token)
- Tokens stored in environment variables, never in code
- Tokens have limited permissions (read-only recommended)

**GitHub API:**
- Uses Personal Access Tokens (PAT)
- Tokens stored in environment variables
- Fine-grained permissions for repositories

**Aha! API:**
- Uses API key authentication
- Keys stored in environment variables

### 2. CORS Configuration

```go
// Allow frontend to access backend API
w.Header().Set("Access-Control-Allow-Origin", "*")  // In dev
// In production: Set to specific frontend domain
```

**Production Recommendation:**
```go
// Only allow requests from frontend domain
origin := r.Header.Get("Origin")
if origin == "https://dashboard.company.com" {
    w.Header().Set("Access-Control-Allow-Origin", origin)
}
```

### 3. Environment Variables

**Never commit:**
- `.env` - Contains all secrets
- `backend/.env`
- `frontend/.env.local`

**Always commit:**
- `.env.example` - Template with no secrets

### 4. Rate Limiting

**JIRA API Rate Limits:**
- Atlassian Cloud: 10 requests/second per IP
- Implementation: Semaphore-based concurrency limiting

```go
semaphore := make(chan struct{}, 10)  // Max 10 concurrent
```

### 5. API Key Protection

**Anthropic API Key:**
- Stored in `.env` file only
- Only accessed in server-side API routes
- Never sent to client browser

### 6. Input Validation

**JQL Injection Prevention:**
```go
// URL encode all JQL parameters
jql := fmt.Sprintf("project = \"%s\"", url.QueryEscape(projectKey))
```

**Issue Key Validation:**
```go
// Validate issue key format before querying
if !regexp.MustCompile(`^[A-Z]+-\d+$`).MatchString(issueKey) {
    return errors.New("invalid issue key")
}
```

---

## Performance Metrics

### Backend Performance

**Typical Response Times:**
- `/api/instances` - 10-20ms (cached)
- `/api/projects` - 500-1000ms (JIRA API call)
- `/api/sprints` - 500-1000ms (JIRA API call)
- `/api/dashboard` (50 issues) - 3-5 seconds (with concurrent changelog fetching)
- `/api/dashboard` (100 issues) - 5-8 seconds (with concurrent changelog fetching)

**Without Concurrency:**
- 100 issues = 100+ sequential API calls = 50-100 seconds

**With Concurrency (10 goroutines):**
- 100 issues = 10 batches of 10 = 5-10 seconds

**Performance Improvement: 10x faster**

### Frontend Performance

**Initial Page Load:**
- First Contentful Paint: < 1 second
- Time to Interactive: < 2 seconds
- Full Dashboard Load: 3-8 seconds (depending on issue count)

**Component Render Times:**
- TeamPerformanceTable (50 developers): 100-200ms
- SprintTicketsTable (100 issues): 200-300ms
- Charts: 50-100ms each

---

## Testing Strategy

### Backend Tests

**Test Coverage: 36 unit tests**

1. **JIRA Client Tests ([jira/client_test.go](../JIRA-Dev-Dashboard/backend/jira/client_test.go)):**
   - API authentication
   - Issue fetching
   - Changelog parsing
   - Error handling

2. **Model Tests ([jira/models_test.go](../JIRA-Dev-Dashboard/backend/jira/models_test.go)):**
   - Data structure validation
   - JSON parsing
   - Field mapping

3. **Analysis Tests ([analysis/analyzer_test.go](../JIRA-Dev-Dashboard/backend/analysis/analyzer_test.go)):**
   - Metrics calculation
   - Rating algorithms
   - Data aggregation

4. **Handler Tests ([api/handlers_test.go](../JIRA-Dev-Dashboard/backend/api/handlers_test.go)):**
   - HTTP request/response
   - Error handling
   - Parameter validation

**Run Backend Tests:**
```bash
cd backend
go test ./... -v -cover
```

### Frontend Tests

**Test Coverage: 43+ tests**

1. **Unit Tests (Vitest):**
   - Component rendering
   - API client
   - Utility functions
   - State management

2. **E2E Tests (Playwright):**
   - Dashboard loading
   - Filter interactions
   - Data export
   - AI features
   - Responsive design

**Run Frontend Tests:**
```bash
cd frontend
npm test                    # Unit tests
npm run test:e2e           # E2E tests
npm run test:coverage      # Coverage report
```

---

## Deployment

### Development Deployment

**Start Both Services:**
```bash
./start.sh  # macOS/Linux
start.bat   # Windows
```

### Production Deployment

**Backend:**
```bash
cd backend
go build -o jira-dashboard
./jira-dashboard
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

**Environment Variables:**
- Set all variables in `.env` file
- Use secrets management in production (e.g., AWS Secrets Manager, HashiCorp Vault)

**Reverse Proxy:**
- Use Nginx or Caddy to serve both frontend and backend
- Enable HTTPS with Let's Encrypt

**Example Nginx Config:**
```nginx
server {
    listen 443 ssl;
    server_name dashboard.company.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
    }
}
```

---

## Future Enhancements

### Planned Features

1. **Caching Layer**
   - Redis for dashboard data caching
   - Reduce JIRA API calls
   - Faster page loads

2. **Real-Time Updates**
   - WebSocket connection for live data
   - Server-sent events for notifications
   - Auto-refresh on data changes

3. **Advanced Analytics**
   - Predictive sprint completion
   - Burndown/burnup charts
   - Velocity trends
   - Team capacity planning

4. **User Authentication**
   - OAuth2 integration
   - Role-based access control
   - User preferences

5. **Notification System**
   - Email alerts for critical metrics
   - Slack integration
   - Custom notification rules

---

## Troubleshooting

See [README.md - Troubleshooting](README.md#-troubleshooting) for common issues and solutions.

---

**Last Updated:** November 2025
**Version:** 1.0
**Maintainer:** Development Team
