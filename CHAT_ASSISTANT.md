# Dashboard Chat Assistant

## Overview

The Dashboard Chat Assistant is an AI-powered conversational interface that helps you interact with your JIRA, GitHub, and Aha data. It uses Claude AI (Sonnet 4.5) with tool calling capabilities to fetch live data and generate insights, reports, and documents.

## Features

### 1. **Live Data Querying**
The assistant can query real-time data from:
- **JIRA**: Search tickets using JQL (JIRA Query Language)
- **GitHub**: Get commits, pull requests, and developer statistics
- **Aha**: Verify ticket integration and feature tracking

### 2. **Document Generation**
Generate professional documents in multiple formats:
- **Word Documents (.docx)**: Reports, summaries, meeting notes
- **Excel Spreadsheets (.xlsx)**: Data tables, metrics, analysis with proper column/row structure
- **PowerPoint Presentations (.pptx)**: Slide decks with proper slide separation

### 3. **Dashboard Analytics**
Analyze sprint metrics, team performance, and project status using the current dashboard context.

## How to Use

### Opening the Chat
- Click the **"Assistant"** button with the lightbulb icon in the header
- Or use the keyboard shortcut: **⌘K** (Mac) or **Ctrl+K** (Windows/Linux)

### Asking Questions

#### JIRA Queries
```
"Show me all high priority bugs"
"Find tickets assigned to John in progress"
"What tickets were created in the last 7 days?"
"Search for items with label 'backend'"
```

#### GitHub Queries
```
"What commits were made in the last 3 days?"
"Show me recent pull requests"
"Get developer stats for the last 2 weeks"
"Who made the most commits this month?"
```

#### Aha Integration
```
"Which JIRA tickets are not in Aha?"
"Verify Aha integration for ticket DEV-123"
"Check if current sprint tickets exist in Aha"
```

#### Document Generation
```
"Generate a Word doc with sprint summary"
"Create an Excel sheet of team performance"
"Make a PowerPoint presentation of sprint metrics"
"Generate a 1-page Word report" (keeps content concise)
```

## Technical Details

### Architecture

**Frontend**: Next.js API route (`/api/chat`) handles chat requests
**Backend**: Go server provides APIs for JIRA, GitHub, and Aha
**AI**: Claude Sonnet 4.5 with tool calling (agentic behavior)

### Tool Calling System

The assistant has access to 5 tools:

1. **search_jira_issues**: Query JIRA using JQL
2. **get_github_commits**: Fetch recent commits
3. **get_github_pull_requests**: Get PR information
4. **get_github_developer_stats**: Get contribution statistics
5. **verify_aha_features**: Check Aha integration

When you ask a question, the AI:
1. Determines if it needs additional data
2. Calls the appropriate tool(s)
3. Processes the results
4. Provides a natural language response

### Document Generation

Documents are generated with specific formatting rules:

**Excel Files**:
- Column headers in first row
- Tab-separated values for proper alignment
- Auto-sized columns
- Support for multiple sheets

**PowerPoint**:
- Each slide separated by double blank lines
- Title on first line, bullets below
- 4-6 bullets per slide (max)
- Automatic title slide for multi-slide decks

**Word Documents**:
- Clear section headings with colons
- Bullet points for lists
- Concise paragraphs (2-4 sentences)
- "1 page" requests fit all content on single page

## Configuration

### Environment Variables

The chat requires:
- `ANTHROPIC_API_KEY`: Claude AI API key
- `API_URL` or `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:8080)

### Backend Requirements

The Go backend must be running with:
- JIRA configuration
- GitHub configuration (optional)
- Aha configuration (optional)

## Troubleshooting

### "I don't have access to that information"

**Solution**: The backend may not be running or the tool calling isn't working.

1. Check backend is running: `lsof -i :8080`
2. Verify API endpoint works: `curl http://localhost:8080/api/search?jql=status="Done"`
3. Check server logs for `[Tool Call]` messages

### Tools Not Being Called

**Solution**: Check console logs in the browser and server logs.

**Server logs** (backend):
```bash
tail -f logs/backend.log
```

**Frontend logs** (Next.js):
```bash
# Check console in browser DevTools
# Look for [Tool Call] messages
```

### API Endpoints Not Found (404)

**Solution**: Rebuild the backend to include new routes.

```bash
cd backend
go build -o ../jira-dashboard .
cd ..
pkill jira-dashboard
./jira-dashboard &
```

## Example Workflows

### Sprint Review Preparation
1. "Generate an Excel sheet with team performance metrics"
2. "Create a PowerPoint presentation for sprint review"
3. "What were the key commits in this sprint?"

### Bug Tracking
1. "Show me all critical bugs"
2. "Which bugs are assigned but not started?"
3. "Generate a Word doc summarizing current bugs"

### Developer Productivity
1. "Get GitHub stats for the last 30 days"
2. "Who has the most pull requests this month?"
3. "Create an Excel report of developer contributions"

## Keyboard Shortcuts

- **⌘K / Ctrl+K**: Toggle chat drawer
- **Enter**: Send message
- **Shift+Enter**: New line in message

## Tips for Best Results

1. **Be specific**: Include details like date ranges, developers names, statuses
2. **Use proper JQL**: For JIRA queries, use valid JQL syntax
3. **Request formats explicitly**: Specify "Excel", "Word", or "PowerPoint" for documents
4. **Mention "1 page"**: If you need concise, single-page documents
5. **Follow up questions**: The chat maintains context, so you can ask follow-up questions

## Privacy & Security

- All queries are processed server-side
- JIRA/GitHub/Aha credentials are stored securely on the backend
- Chat conversations are not persisted (cleared when drawer closes)
- Claude AI only receives data you explicitly query

## Future Enhancements

Potential improvements:
- Conversation history persistence
- Multi-turn clarifying questions
- Chart and graph generation
- Email integration for sending reports
- Scheduled report generation
- Custom JQL templates
- Integration with Slack/Teams

## Support

For issues or feature requests, please check:
- Server logs: `logs/backend.log`
- Frontend console (browser DevTools)
- GitHub issues: https://github.com/anthropics/claude-code/issues
