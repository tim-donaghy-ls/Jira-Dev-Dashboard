# JIRA Dashboard - Project Structure

## Directory Organization

```
jira-dashboard-unified/
│
├── 📄 README.md                    # Comprehensive documentation
├── 📄 QUICKSTART.md                # 5-minute setup guide
├── 📄 PROJECT_STRUCTURE.md         # This file
│
├── 🔧 .env                         # Main configuration file (DO NOT COMMIT)
├── 🔧 .env.example                 # Template for environment setup
├── 📋 .gitignore                   # Git ignore rules
│
├── 🚀 start.sh                     # Unix/macOS startup script
├── 🚀 start.bat                    # Windows startup script
├── 🛑 stop.sh                      # Unix/macOS stop script
├── 🛑 stop.bat                     # Windows stop script
│
├── 📊 backend/                     # Go Backend Server
│   ├── api/                        # API handlers and routes
│   │   └── handler.go              # Main API handler with routes
│   ├── config/                     # Configuration management
│   │   └── config.go               # Loads and validates .env config
│   ├── jira/                       # JIRA client and data fetching
│   │   └── client.go               # JIRA API client implementation
│   ├── main.go                     # Application entry point
│   ├── go.mod                      # Go module definition
│   ├── .env                        # Backend environment (auto-copied)
│   └── .env.example                # Backend config template
│
├── ⚛️  frontend/                    # Next.js Frontend Application
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout component
│   │   ├── page.tsx                # Main dashboard page
│   │   ├── globals.css             # Global styles
│   │   └── api/                    # API route handlers
│   │       └── release-notes/      # AI release notes endpoint
│   │           └── route.ts
│   │
│   ├── components/                 # React Components
│   │   ├── SprintTicketsTable.tsx  # Sprint tickets display & export
│   │   ├── TeamPerformanceTable.tsx # Team metrics & rankings
│   │   ├── ThemeToggle.tsx         # Dark/Light mode toggle
│   │   └── ...                     # Other UI components
│   │
│   ├── context/                    # React Context Providers
│   │   └── ThemeContext.tsx        # Theme state management
│   │
│   ├── hooks/                      # Custom React Hooks
│   │   └── useJiraData.ts          # JIRA data fetching hook
│   │
│   ├── lib/                        # Utility Functions
│   │   └── utils.ts                # Helper functions
│   │
│   ├── public/                     # Static Assets
│   │   └── ...                     # Images, fonts, etc.
│   │
│   ├── types/                      # TypeScript Definitions
│   │   └── jira.ts                 # JIRA data type definitions
│   │
│   ├── .env.local                  # Frontend environment (auto-copied)
│   ├── .env.local.example          # Frontend config template
│   ├── package.json                # Node dependencies
│   ├── package-lock.json           # Locked dependency versions
│   ├── next.config.ts              # Next.js configuration
│   ├── tsconfig.json               # TypeScript configuration
│   ├── tailwind.config.js          # Tailwind CSS configuration
│   ├── postcss.config.mjs          # PostCSS configuration
│   ├── eslint.config.mjs           # ESLint configuration
│   └── .gitignore                  # Frontend-specific ignores
│
└── 📝 logs/                        # Runtime Logs (auto-created)
    ├── backend.log                 # Go server logs
    ├── frontend.log                # Next.js dev server logs
    ├── backend.pid                 # Backend process ID
    └── frontend.pid                # Frontend process ID
```

## Data Flow

```
User Browser (http://localhost:3000)
         ↓
    Next.js Frontend
    (React Components)
         ↓
    API Calls (fetch)
         ↓
    Go Backend (http://localhost:8080)
    (REST API Server)
         ↓
    JIRA API Client
         ↓
    Atlassian JIRA Cloud
    (your-domain.atlassian.net)
```

## Key Files Explained

### Configuration Files

**`.env`** (Root)
- Single source of truth for all configuration
- Contains JIRA credentials, API keys, and ports
- Auto-copied to backend/.env and frontend/.env.local by startup script
- **NEVER commit this file**

**`.env.example`**
- Template showing all required and optional variables
- Safe to commit (no secrets)
- Copy this to `.env` and fill in your values

### Startup Scripts

**`start.sh` / `start.bat`**
- Checks dependencies (Go, Node.js)
- Validates .env exists
- Distributes .env to backend and frontend
- Installs npm dependencies if needed
- Starts both servers
- Opens browser automatically
- Monitors processes

**`stop.sh` / `stop.bat`**
- Gracefully stops both servers
- Cleans up PID files
- Kills processes on ports 3000 and 8080
- Removes Next.js lock files

### Backend Files

**`backend/main.go`**
- Application entry point
- Loads configuration from .env
- Initializes JIRA clients (supports multiple instances)
- Sets up HTTP routes with CORS
- Starts server on configured port

**`backend/api/handler.go`**
- Defines all API endpoints
- Handles data aggregation from JIRA
- Routes:
  - `/api/tickets` - Get all tickets
  - `/api/stats` - Get team statistics
  - `/api/health` - Health check endpoint

**`backend/jira/client.go`**
- JIRA API client implementation
- Handles authentication (email + API token)
- Fetches issues with JQL queries
- Parses JIRA response data

**`backend/config/config.go`**
- Loads environment variables
- Validates configuration
- Supports multiple JIRA instances

### Frontend Files

**`frontend/app/page.tsx`**
- Main dashboard page
- Renders TeamPerformanceTable and SprintTicketsTable
- Manages overall layout

**`frontend/components/TeamPerformanceTable.tsx`**
- Displays developer performance metrics
- Implements 5-star ranking system with weighted scoring
- Shows expandable sprint-by-sprint metrics
- Provides Excel export functionality
- Features custom tooltips with rating breakdowns

**`frontend/components/SprintTicketsTable.tsx`**
- Displays all sprint tickets
- Implements filtering and sorting
- Provides Excel export
- Integrates AI release notes generation

**`frontend/hooks/useJiraData.ts`**
- Custom hook for fetching JIRA data from backend
- Handles loading states and errors
- Provides reactive data updates

**`frontend/app/api/release-notes/route.ts`**
- Server-side API route
- Calls Anthropic Claude API
- Generates AI-powered release notes from ticket data

## Environment Variables Reference

### Backend Variables (Go)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JIRA_BASE_URL` | Yes | Primary JIRA URL | `https://company.atlassian.net` |
| `JIRA_EMAIL` | Yes | Your JIRA email | `user@company.com` |
| `JIRA_API_TOKEN` | Yes | JIRA API token | `ATATT3xFfGF0...` |
| `JIRA_INSTANCE_NAME` | No | Display name | `Primary Instance` |
| `JIRA_BASE_URL_2` | No | Secondary JIRA URL | (optional) |
| `JIRA_EMAIL_2` | No | Secondary email | (optional) |
| `JIRA_API_TOKEN_2` | No | Secondary token | (optional) |
| `JIRA_INSTANCE_NAME_2` | No | Secondary name | (optional) |
| `SERVER_PORT` | No | Backend port | `8080` (default) |

### Frontend Variables (Next.js)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL | `http://localhost:8080` |
| `ANTHROPIC_API_KEY` | No | Claude API key | `sk-ant-...` |

## Port Usage

- **3000**: Next.js Frontend (Development)
- **8080**: Go Backend API Server

## Build Artifacts (Ignored by Git)

- `frontend/.next/` - Next.js build cache
- `frontend/node_modules/` - npm dependencies
- `backend/jira-dashboard` - Compiled Go binary
- `logs/` - Runtime logs
- `.env` - Environment configuration

## Technology Stack

### Backend
- **Language**: Go 1.16+
- **HTTP Server**: Standard library `net/http`
- **JIRA Integration**: Custom REST client
- **Configuration**: Environment variables via `.env`

### Frontend
- **Framework**: Next.js 16.0.1 (App Router)
- **UI Library**: React 19.2.0
- **Styling**: Tailwind CSS 3.4.1
- **Language**: TypeScript 5
- **State Management**: React Context + Hooks
- **Excel Export**: SheetJS (xlsx) 0.18.5
- **AI Integration**: Anthropic Claude API

## Development Workflow

1. **Initial Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   cd frontend && npm install && cd ..
   ```

2. **Start Development**
   ```bash
   ./start.sh  # or start.bat on Windows
   ```

3. **Make Changes**
   - Backend: Edit files in `backend/`, Go auto-recompiles on run
   - Frontend: Edit files in `frontend/`, Next.js hot-reloads

4. **View Logs**
   ```bash
   tail -f logs/backend.log
   tail -f logs/frontend.log
   ```

5. **Stop Servers**
   ```bash
   ./stop.sh  # or stop.bat on Windows
   ```

## Production Build

### Backend
```bash
cd backend
go build -o jira-dashboard
./jira-dashboard
```

### Frontend
```bash
cd frontend
npm run build
npm start
```

## Security Considerations

1. **Never commit `.env` files** - Contains sensitive credentials
2. **Rotate API tokens regularly** - Especially if exposed
3. **Use HTTPS in production** - Don't expose over HTTP
4. **Limit JIRA API token scope** - Use read-only tokens if possible
5. **Protect Anthropic API key** - Monitor usage and set limits

## Troubleshooting

See [README.md](README.md#troubleshooting) for comprehensive troubleshooting guide.

---

**Last Updated**: November 2025
