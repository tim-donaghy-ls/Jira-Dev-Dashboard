# JIRA Dashboard - Quick Start Guide

Get up and running in 5 minutes! ⚡

## Prerequisites Checklist

- [ ] Go installed (1.16+)
- [ ] Node.js installed (18+)
- [ ] JIRA account with API access
- [ ] JIRA API token ready

## 3-Step Setup

### 1️⃣ Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and fill in your JIRA credentials
nano .env   # or use your favorite editor
```

**Required fields in `.env`:**
```bash
PRIMARY_JIRA_BASE_URL=https://your-domain.atlassian.net
PRIMARY_JIRA_EMAIL=your-email@company.com
PRIMARY_JIRA_API_TOKEN=your-token-here
```

Get your JIRA API token here: https://id.atlassian.com/manage-profile/security/api-tokens

### 2️⃣ Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install
cd ..

# Backend dependencies auto-install on first run
```

### 3️⃣ Start the Application

**On macOS/Linux:**
```bash
./start.sh
```

**On Windows:**
```bash
start.bat
```

That's it! 🎉

The dashboard will open automatically at **http://localhost:3000**

## What You'll See

1. **Team Performance** - Developer rankings with 5-star ratings
2. **Sprint Tickets** - All your JIRA tickets with status tracking
3. **Export Options** - Excel export and AI release notes

## Stopping the Application

**On macOS/Linux:**
```bash
./stop.sh
```

**On Windows:**
```bash
stop.bat
```

## Troubleshooting

### "Port already in use"
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:8080 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

### "Cannot connect to JIRA"
- Double-check your API token
- Verify your JIRA URL (should end with `.atlassian.net`)
- Ensure your email matches your JIRA account

### "Data not loading"
1. Check backend logs: `cat logs/backend.log`
2. Check frontend logs: `cat logs/frontend.log`
3. Verify backend is running: `curl http://localhost:8080/api/health`

## Next Steps

- ✅ Explore the Team Performance metrics
- ✅ Try the Excel export feature
- ✅ Set up Anthropic API key for AI release notes (optional)
- ✅ Customize filters and views

For detailed documentation, see [README.md](README.md)

---

**Need help?** Check the full README.md for comprehensive troubleshooting and advanced configuration.
