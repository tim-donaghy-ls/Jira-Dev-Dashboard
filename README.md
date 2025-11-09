# JIRA Dashboard - Unified Application

A comprehensive JIRA analytics dashboard with a Go backend and Next.js frontend, providing real-time insights into team performance, sprint metrics, and developer productivity.

## 🚀 Features

### Team Performance Analytics
- **Developer Rankings**: 5-star rating system based on weighted performance metrics
- **Performance Metrics**: Story points, completion rates, development time, quality scores
- **Interactive Tooltips**: Detailed breakdown of rating calculations
- **Expandable Rows**: Deep dive into individual developer sprint metrics

### Sprint Management
- **Sprint Tickets View**: Comprehensive ticket tracking with status monitoring
- **Excel Export**: Export team performance and sprint data
- **AI-Powered Release Notes**: Generate release notes using Claude AI

### Real-Time Data
- Live JIRA integration with multiple instance support
- Automatic data aggregation and analysis
- Cross-team collaboration tracking

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Go** (version 1.16 or higher) - [Download](https://golang.org/dl/)
- **Node.js** (version 18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **JIRA Account** with API access
- **Anthropic API Key** (optional, for AI release notes feature)

## 🛠️ Installation & Setup

### Step 1: Clone or Navigate to the Project

```bash
cd jira-dashboard-unified
```

### Step 2: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit the `.env` file and fill in your credentials:

```bash
# Primary JIRA Instance (Required)
PRIMARY_JIRA_NAME=Your Company Name
PRIMARY_JIRA_BASE_URL=https://your-domain.atlassian.net
PRIMARY_JIRA_EMAIL=your-email@company.com
PRIMARY_JIRA_API_TOKEN=your-jira-api-token-here

# Secondary JIRA Instance (Optional)
SECONDARY_JIRA_NAME=
SECONDARY_JIRA_BASE_URL=
SECONDARY_JIRA_EMAIL=
SECONDARY_JIRA_API_TOKEN=

# Server Configuration
SERVER_PORT=8080

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080

# Anthropic API Key (Optional - for AI features)
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

#### How to Get Your JIRA API Token:
1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a name (e.g., "JIRA Dashboard")
4. Copy the generated token

#### How to Get Anthropic API Key (Optional):
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key

### Step 3: Install Dependencies

#### Backend (Go):
```bash
cd backend
go mod download
cd ..
```

#### Frontend (Next.js):
```bash
cd frontend
npm install
cd ..
```

## 🎯 Running the Application

### Option 1: Using the Startup Script (Recommended)

We provide a convenient startup script that runs both backend and frontend:

#### On macOS/Linux:
```bash
chmod +x start.sh
./start.sh
```

#### On Windows:
```bash
start.bat
```

The script will:
1. Start the Go backend on port 8080
2. Start the Next.js frontend on port 3000
3. Open your browser automatically

### Option 2: Manual Start

If you prefer to run the services manually:

#### Terminal 1 - Start the Backend:
```bash
cd backend
go run main.go
```

The backend will start on `http://localhost:8080`

#### Terminal 2 - Start the Frontend:
```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

#### Terminal 3 - Build Backend Binary (Optional):
```bash
cd backend
go build -o jira-dashboard
./jira-dashboard
```

## 🌐 Accessing the Dashboard

Once both services are running:

1. Open your browser to: **http://localhost:3000**
2. The dashboard will automatically connect to the backend at port 8080
3. Data will load automatically from your configured JIRA instance(s)

## 📁 Project Structure

```
jira-dashboard-unified/
├── backend/                 # Go backend server
│   ├── api/                # API handlers and routes
│   ├── config/             # Configuration management
│   ├── jira/               # JIRA client and data fetching
│   ├── main.go             # Application entry point
│   └── go.mod              # Go dependencies
│
├── frontend/               # Next.js frontend application
│   ├── app/                # Next.js app router pages
│   ├── components/         # React components
│   │   ├── SprintTicketsTable.tsx
│   │   ├── TeamPerformanceTable.tsx
│   │   └── ...
│   ├── context/            # React context providers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── public/             # Static assets
│   ├── types/              # TypeScript type definitions
│   ├── package.json        # Node dependencies
│   └── next.config.ts      # Next.js configuration
│
├── .env.example            # Example environment variables
├── .gitignore              # Git ignore rules
├── README.md               # This file
├── start.sh                # Unix startup script
└── start.bat               # Windows startup script
```

## 🔧 Configuration Details

### Backend Configuration

The Go backend uses environment variables to configure JIRA connections:

- **Multiple JIRA Instances**: Supports primary and secondary JIRA instances
- **Port Configuration**: Configurable server port (default: 8080)
- **CORS Enabled**: Allows frontend to communicate from different origin

## 🧪 Testing

This project includes comprehensive unit tests for both backend and frontend code.

### Running All Tests

Use the unified test script to run all tests:

```bash
./test-all.sh
```

### Running Tests Individually

#### Backend Tests (Go)
```bash
cd backend
go test ./...                    # Run all tests
go test ./... -v                 # Verbose output
go test ./... -cover             # With coverage
go test ./jira -v                # Test specific package
```

#### Frontend Tests (Vitest)
```bash
cd frontend
npm test                         # Run tests in watch mode
npm test -- --run                # Run tests once
npm run test:ui                  # Run with UI
npm run test:coverage            # Generate coverage report
```

### Test Coverage

- **Backend**: 36 unit tests covering JIRA client, models, and analysis
  - JIRA API client tests
  - Development metrics calculation tests
  - Data analysis and aggregation tests

- **Frontend Unit Tests**: 18 tests covering API client
  - All API endpoints
  - Error handling
  - Query parameter encoding

- **Frontend E2E Tests**: 25+ tests covering full user flows
  - Dashboard loading and navigation
  - Filter selection and data display
  - Charts and visualizations
  - Accessibility and responsive design
  - Error handling scenarios

### Running E2E Tests

E2E tests use Playwright and require the application to be running:

```bash
# Start the application first
./start.sh

# In another terminal, run E2E tests
cd frontend
npm run test:e2e              # Run headless
npm run test:e2e:ui           # Run with Playwright UI
npm run test:e2e:headed       # Run in browser (visible)
```

For detailed testing documentation, see [TESTING.md](TESTING.md)

### Frontend Configuration

The Next.js frontend is configured via:

- **API URL**: Points to the Go backend (`NEXT_PUBLIC_API_URL`)
- **Anthropic API**: For AI-powered release notes generation
- **Tailwind CSS**: For styling
- **TypeScript**: For type safety

## 📊 Features Guide

### Team Performance Section

- **Stack Ranking**: Developers ranked by comprehensive performance metrics
- **5-Star Rating**: Visual rating based on:
  - Story Points Completed (30% weight)
  - Completion Rate (25% weight)
  - Development Time (20% weight)
  - Quality Score (15% weight)
  - Recovery Rate (10% weight)
- **Hover Tooltips**: See detailed breakdown of rating calculations
- **Expandable Metrics**: Click rows to see sprint-by-sprint performance

### Sprint Tickets Section

- **Ticket Tracking**: View all tickets with status, assignee, and dates
- **Actions Menu**:
  - Export to Excel
  - Generate AI Release Notes (requires Anthropic API key)
- **Filtering**: Easy-to-use filters for status, assignee, etc.

### Excel Export

Export comprehensive metrics including:
- Team performance summary
- Individual developer metrics
- Sprint-by-sprint breakdowns
- Ticket details

## 🐛 Troubleshooting

### Backend Won't Start

**Error**: "Connection refused" or "Cannot connect to JIRA"

**Solution**:
1. Verify your `.env` file has correct JIRA credentials
2. Test your JIRA API token at: https://your-domain.atlassian.net/rest/api/3/myself
3. Check if port 8080 is already in use: `lsof -ti:8080` (Mac/Linux) or `netstat -ano | findstr :8080` (Windows)

### Frontend Won't Start

**Error**: "Port 3000 already in use"

**Solution**:
1. Kill the process on port 3000
2. Or change the port by adding to `frontend/package.json`:
   ```json
   "dev": "next dev -p 3001"
   ```

### Data Not Loading

**Solution**:
1. Check if backend is running: `curl http://localhost:8080/api/health`
2. Check browser console for errors (F12)
3. Verify `NEXT_PUBLIC_API_URL` in frontend `.env.local` matches backend port

### AI Release Notes Not Working

**Error**: "401 Unauthorized" or "Failed to generate release notes"

**Solution**:
1. Verify you have a valid Anthropic API key
2. Check the `ANTHROPIC_API_KEY` is set in `.env`
3. Ensure your API key has sufficient credits

## 🔒 Security Notes

- **Never commit `.env` files** to version control
- **Protect your API tokens** - treat them like passwords
- **Rotate tokens regularly** for security
- **Use read-only JIRA accounts** if possible for dashboard access

## 🚦 Production Deployment

### Backend

Build the Go binary:
```bash
cd backend
go build -o jira-dashboard
```

Deploy the binary with your `.env` file to your server.

### Frontend

Build the Next.js application:
```bash
cd frontend
npm run build
npm start
```

Or deploy to Vercel/Netlify following their deployment guides.

## 📝 Development

### Adding New Features

1. **Backend**: Add new endpoints in `backend/api/`
2. **Frontend**: Add new components in `frontend/components/`
3. **Types**: Update TypeScript types in `frontend/types/`

### Running in Development Mode

Both services support hot-reload:
- **Backend**: Uses `go run` for automatic recompilation
- **Frontend**: Next.js dev server with Fast Refresh

## 🤝 Support

For issues, questions, or contributions:
1. Check the troubleshooting section above
2. Review JIRA API documentation
3. Check Next.js documentation for frontend issues

## 📄 License

This project is for internal use. Ensure compliance with JIRA API terms of service and Anthropic API usage terms.

---

**Built with ❤️ using Go and Next.js**
