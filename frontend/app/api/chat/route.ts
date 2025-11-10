import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { DashboardData } from '@/types'

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
  {
    name: 'search_jira_issues',
    description: 'Search for JIRA issues using JQL (JIRA Query Language). Use this to find specific tickets, filter by status, assignee, labels, or any JIRA field. Returns detailed issue information including description, status, assignee, story points, and history.',
    input_schema: {
      type: 'object',
      properties: {
        jql: {
          type: 'string',
          description: 'JIRA Query Language query. Examples: "assignee = john.smith AND status = \"In Progress\"", "labels = backend", "created >= -7d"'
        },
        instance: {
          type: 'string',
          description: 'JIRA instance ID (optional, defaults to current instance)'
        }
      },
      required: ['jql']
    }
  },
  {
    name: 'get_github_commits',
    description: 'Get recent commits from GitHub repositories. Returns commit details including author, date, message, and code changes (additions/deletions).',
    input_schema: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'Repository name (optional, queries all repos if not specified)'
        },
        author: {
          type: 'string',
          description: 'Filter by commit author username (optional)'
        },
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 7)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_github_pull_requests',
    description: 'Get pull requests from GitHub repositories. Returns PR details including title, status, author, reviewers, and merge information.',
    input_schema: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'Repository name (optional, queries all repos if not specified)'
        },
        state: {
          type: 'string',
          description: 'PR state: "open", "closed", or "all" (default: "all")',
          enum: ['open', 'closed', 'all']
        },
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 30)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_github_developer_stats',
    description: 'Get GitHub contribution statistics for developers. Returns metrics like commit count, PRs, code additions/deletions, and activity trends.',
    input_schema: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'Repository name (optional, aggregates all repos if not specified)'
        },
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 30)'
        }
      },
      required: []
    }
  },
  {
    name: 'verify_aha_features',
    description: 'Verify if JIRA ticket IDs exist in Aha product management system. Returns which tickets are linked to Aha features and which are not.',
    input_schema: {
      type: 'object',
      properties: {
        jiraKeys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of JIRA ticket keys to verify (e.g., ["PROJ-123", "PROJ-456"])'
        }
      },
      required: ['jiraKeys']
    }
  }
]

// Tool execution functions
async function executeToolCall(toolName: string, toolInput: any): Promise<any> {
  // Use backend API URL - in production this should be configured properly
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

  try {
    console.log(`[Tool Call] Executing ${toolName} with input:`, toolInput)
    console.log(`[Tool Call] Using API URL: ${apiUrl}`)

    switch (toolName) {
      case 'search_jira_issues': {
        const { jql, instance } = toolInput
        const params = new URLSearchParams({
          jql,
          ...(instance && { instance })
        })
        const url = `${apiUrl}/api/search?${params}`
        console.log(`[Tool Call] Fetching: ${url}`)
        const response = await fetch(url)
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Tool Call] JIRA API error: ${response.status} ${response.statusText}`, errorText)
          throw new Error(`JIRA API error: ${response.statusText}`)
        }
        const data = await response.json()
        console.log(`[Tool Call] JIRA search returned ${data.count || 0} issues`)
        return data
      }

      case 'get_github_commits': {
        const { repo, author, days = 7 } = toolInput
        const params = new URLSearchParams({
          days: days.toString(),
          ...(repo && { repo }),
          ...(author && { author })
        })
        const url = `${apiUrl}/api/github/commits?${params}`
        console.log(`[Tool Call] Fetching: ${url}`)
        const response = await fetch(url)
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Tool Call] GitHub API error: ${response.status} ${response.statusText}`, errorText)
          throw new Error(`GitHub API error: ${response.statusText}`)
        }
        const data = await response.json()
        console.log(`[Tool Call] GitHub commits returned ${data.commits?.length || 0} commits`)
        return data
      }

      case 'get_github_pull_requests': {
        const { repo, state = 'all', days = 30 } = toolInput
        const params = new URLSearchParams({
          days: days.toString(),
          state,
          ...(repo && { repo })
        })
        const url = `${apiUrl}/api/github/prs?${params}`
        console.log(`[Tool Call] Fetching: ${url}`)
        const response = await fetch(url)
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Tool Call] GitHub API error: ${response.status} ${response.statusText}`, errorText)
          throw new Error(`GitHub API error: ${response.statusText}`)
        }
        const data = await response.json()
        console.log(`[Tool Call] GitHub PRs returned ${data.prs?.length || 0} PRs`)
        return data
      }

      case 'get_github_developer_stats': {
        const { repo, days = 30 } = toolInput
        const params = new URLSearchParams({
          days: days.toString(),
          ...(repo && { repo })
        })
        const url = `${apiUrl}/api/github/stats?${params}`
        console.log(`[Tool Call] Fetching: ${url}`)
        const response = await fetch(url)
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Tool Call] GitHub API error: ${response.status} ${response.statusText}`, errorText)
          throw new Error(`GitHub API error: ${response.statusText}`)
        }
        const data = await response.json()
        console.log(`[Tool Call] GitHub stats returned data for ${Object.keys(data.developers || {}).length} developers`)
        return data
      }

      case 'verify_aha_features': {
        const { jiraKeys } = toolInput
        const url = `${apiUrl}/api/aha/verify`
        console.log(`[Tool Call] Fetching: ${url}`)
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jiraKeys })
        })
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Tool Call] Aha API error: ${response.status} ${response.statusText}`, errorText)
          throw new Error(`Aha API error: ${response.statusText}`)
        }
        const data = await response.json()
        console.log(`[Tool Call] Aha verification returned data for ${jiraKeys.length} keys`)
        return data
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  } catch (error) {
    console.error(`[Tool Call] Tool execution error for ${toolName}:`, error)
    return {
      error: error instanceof Error ? error.message : 'Tool execution failed',
      details: error instanceof Error ? error.stack : undefined
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, dashboardData } = await request.json()

    // Validation
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      )
    }

    if (!dashboardData) {
      return NextResponse.json(
        { error: 'Dashboard data is required' },
        { status: 400 }
      )
    }

    // Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    const anthropic = new Anthropic({ apiKey })

    // Build context from dashboard data
    const context = buildDashboardContext(dashboardData)

    const prompt = `You are an advanced data analyst assistant for a JIRA dashboard. Your role is to help users understand their sprint metrics, team performance, and project status by analyzing dashboard data. You can also generate documents, reports, and data exports.

CAPABILITIES:
1. Analyze dashboard data and provide clear, easy-to-read insights
2. Query live data from JIRA, GitHub, and Aha using available tools
3. Generate Word documents (.docx format) - for reports, summaries, meeting notes
4. Generate Excel spreadsheets (.xlsx format) - for data tables, metrics, analysis
5. Generate PowerPoint presentations (.pptx format) - for presentations, status reports
6. Generate code snippets and configuration files when specifically requested
7. Export data in CSV, JSON, or other formats

AVAILABLE TOOLS (You MUST use these when appropriate):
- search_jira_issues: Query JIRA for specific tickets using JQL. Use for ANY query about JIRA tickets, bugs, features, or specific developers' work.
- get_github_commits: Fetch recent commits from GitHub repositories. Use when asked about commits, code changes, or recent development activity.
- get_github_pull_requests: Get PR information from GitHub. Use when asked about pull requests, code reviews, or merges.
- get_github_developer_stats: Get developer contribution statistics from GitHub. Use when asked about developer productivity, commit counts, or code metrics.
- verify_aha_features: Check if JIRA tickets exist in Aha. Use when asked about Aha integration or ticket verification.

CRITICAL: You MUST use these tools when the user asks questions that require:
- Searching for specific JIRA tickets (e.g., "find bugs", "show tickets for John", "high priority items")
- GitHub activity (e.g., "recent commits", "pull requests", "developer stats")
- Aha verification (e.g., "check Aha", "verify tickets")

DO NOT say you "don't have access" to this information. USE THE TOOLS to fetch it!

IMPORTANT FORMATTING RULES:
- Write responses in clear, natural language without markdown formatting UNLESS specifically requested
- Use plain text with proper spacing and line breaks for readability
- Only use code blocks when the user asks for code, scripts, or technical content
- For document generation (Word, Excel, PowerPoint), provide the complete content structure
- When generating documents, use special markers:
  * [WORD_DOCUMENT] for Word documents
  * [EXCEL_SPREADSHEET] for Excel files
  * [POWERPOINT_PRESENTATION] for PowerPoint files
- Structure document content clearly with sections, headings, and bullet points using plain text

RESPONSE STYLE:
- Be conversational and clear
- Use bullet points with "•" or "-" for lists
- Use numbers for ordered lists (1., 2., 3.)
- Separate sections with blank lines
- Highlight key metrics and numbers
- Avoid technical jargon unless necessary

==============================================
CRITICAL DOCUMENT GENERATION INSTRUCTIONS:
==============================================

WHEN GENERATING WORD DOCUMENTS:
- If user specifies "1 page", ensure ALL content fits on a SINGLE page by being concise
- Use clear section headings followed by colon (e.g., "Executive Summary:")
- Use bullet points (- or •) for lists
- Keep paragraphs short and focused (2-4 sentences max)
- Organize content with proper hierarchy: Main headings → Subheadings → Bullet points
- Example structure for 1-page report:
  Sprint Summary: [2-3 sentences]
  Key Metrics:
  - Metric 1: [value and brief context]
  - Metric 2: [value and brief context]
  Team Performance:
  - Developer 1: [brief stats]
  - Developer 2: [brief stats]

WHEN GENERATING EXCEL SPREADSHEETS:
- ALWAYS structure as proper table with column headers in the first row
- Use tab characters (\t) to separate columns clearly
- First line MUST be column headers (e.g., "Developer\tTickets Completed\tStory Points\tCompletion Rate")
- Each subsequent line is a data row with values aligned to columns
- Keep data organized and aligned - each row should have the same number of columns
- Use consistent formatting (e.g., percentages with %, numbers with 1 decimal)
- Example structure:
  Metric\tValue\tTarget\tStatus
  Tickets Completed\t45\t50\t90%
  Story Points\t123.5\t140\t88%
- For multi-sheet requests, clearly separate with "SHEET: [Name]" markers

WHEN GENERATING POWERPOINT PRESENTATIONS:
- CRITICAL: Each slide MUST be separated by a blank line followed by another blank line
- First line of each slide is the slide title (clear and concise)
- Following lines are bullet points for that slide content
- Limit to 4-6 bullet points per slide for readability
- Keep bullet points concise (1 line each, max 10-12 words)
- Use numbers (1., 2., 3.) for sequential steps, bullets (- or •) for lists
- Example structure:

  Sprint Overview
  - Total tickets: 45 completed out of 50
  - Story points: 123.5 delivered
  - Team completion rate: 90%
  - Average development time: 3.2 days

  Top Performers
  - John Smith: 15 tickets, 45 points
  - Jane Doe: 12 tickets, 38 points
  - Mike Johnson: 10 tickets, 30 points

WHEN USER SAYS "1 PAGE" OR "SINGLE PAGE":
- This means ALL content must be consolidated and fit on ONE page
- Be extremely concise and selective with information
- Prioritize the most important metrics and insights
- Use abbreviated formats and compact layouts
- Remove any unnecessary explanatory text
- For Word: Use tight spacing, combine related items, limit to essential information
- For PowerPoint: Create exactly 1 slide with the most critical points only
- For Excel: Keep to essential columns and top 10-15 rows maximum

${context}

User Question: ${query}

Answer based on the dashboard data above. Be specific, cite numbers when relevant. Use natural language formatting. Only use markdown code blocks if the user specifically requests code or technical content. For document generation requests, use the special markers and provide structured content following the CRITICAL DOCUMENT GENERATION INSTRUCTIONS above.`

    // Initialize conversation messages
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: prompt
      }
    ]

    // Agentic loop: Allow Claude to use tools and respond
    let finalAnswer = ''
    const maxIterations = 5 // Prevent infinite loops
    let iteration = 0

    while (iteration < maxIterations) {
      iteration++

      // Call Claude API with tools
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        temperature: 0.3,
        messages: messages,
        tools: tools
      })

      console.log(`Iteration ${iteration}: Stop reason = ${message.stop_reason}`)

      // Check if Claude wants to use a tool
      if (message.stop_reason === 'tool_use') {
        // Find tool use blocks
        const toolUseBlocks = message.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        )

        // Add Claude's response to conversation
        messages.push({
          role: 'assistant',
          content: message.content
        })

        // Execute all tools
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const toolUse of toolUseBlocks) {
          console.log(`Executing tool: ${toolUse.name}`, toolUse.input)
          const result = await executeToolCall(toolUse.name, toolUse.input)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result)
          })
        }

        // Add tool results to conversation
        messages.push({
          role: 'user',
          content: toolResults
        })

        // Continue the loop to get Claude's response to the tool results
        continue
      }

      // If no tools needed, extract final answer
      const textBlocks = message.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      )
      finalAnswer = textBlocks.map(block => block.text).join('\n')
      break
    }

    if (!finalAnswer) {
      finalAnswer = 'I apologize, but I was unable to complete your request. Please try rephrasing your question.'
    }

    return NextResponse.json({ answer: finalAnswer })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process query' },
      { status: 500 }
    )
  }
}

function buildDashboardContext(data: DashboardData): string {
  const parts: string[] = []

  // Sprint Info
  if (data.sprintInfo) {
    parts.push(`**Sprint Information:**`)
    parts.push(`- Sprint Name: ${data.sprintInfo.name}`)
    if (data.sprintInfo.startDate) {
      parts.push(`- Start Date: ${data.sprintInfo.startDate}`)
    }
    if (data.sprintInfo.endDate) {
      parts.push(`- End Date: ${data.sprintInfo.endDate}`)
    }
    parts.push('')
  }

  // Summary Statistics
  parts.push(`**Summary Statistics:**`)
  parts.push(`- Total Issues: ${data.summary.totalIssues}`)
  parts.push(`- Open Issues: ${data.summary.openIssues}`)
  parts.push(`- Closed Issues: ${data.summary.closedIssues}`)
  parts.push(`- Completion Rate: ${data.summary.closedIssues > 0 ? Math.round((data.summary.closedIssues / data.summary.totalIssues) * 100) : 0}%`)
  parts.push(`- Total Story Points: ${data.summary.totalStoryPoints.toFixed(1)}`)
  parts.push(`- Closed Story Points: ${data.summary.closedStoryPoints.toFixed(1)}`)
  parts.push(`- Open Story Points: ${data.summary.openStoryPoints.toFixed(1)}`)
  parts.push(`- Average Development Time: ${data.summary.avgResolutionDays.toFixed(1)} days`)
  parts.push('')

  // Status Breakdown
  if (data.statusBreakdown && Object.keys(data.statusBreakdown).length > 0) {
    parts.push(`**Status Breakdown:**`)
    Object.entries(data.statusBreakdown)
      .sort(([, a], [, b]) => b - a)
      .forEach(([status, count]) => {
        parts.push(`- ${status}: ${count}`)
      })
    parts.push('')
  }

  // Priority Breakdown
  if (data.priorityBreakdown && Object.keys(data.priorityBreakdown).length > 0) {
    parts.push(`**Priority Breakdown:**`)
    Object.entries(data.priorityBreakdown)
      .sort(([, a], [, b]) => b - a)
      .forEach(([priority, count]) => {
        parts.push(`- ${priority}: ${count}`)
      })
    parts.push('')
  }

  // Issue Type Summary (from all issues)
  const typeCount: { [key: string]: number } = {}
  data.allIssues.forEach(issue => {
    typeCount[issue.issueType] = (typeCount[issue.issueType] || 0) + 1
  })
  if (Object.keys(typeCount).length > 0) {
    parts.push(`**Issue Type Breakdown:**`)
    Object.entries(typeCount)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        parts.push(`- ${type}: ${count}`)
      })
    parts.push('')
  }

  // Team Performance
  if (data.assigneeStats && data.assigneeStats.length > 0) {
    parts.push(`**Team Performance:**`)
    data.assigneeStats.slice(0, 10).forEach(dev => {
      const completionRate = dev.totalIssues > 0
        ? Math.round((dev.closedIssues / dev.totalIssues) * 100)
        : 0
      parts.push(`- ${dev.name}: ${dev.totalIssues} issues (${dev.closedIssues} closed, ${completionRate}% completion), ${dev.totalStoryPoints.toFixed(1)} story points`)
    })
    parts.push('')
  }

  // Sprint Velocity (calculated from summary)
  if (data.summary.closedStoryPoints > 0) {
    parts.push(`**Sprint Velocity:**`)
    parts.push(`- Completed Story Points: ${data.summary.closedStoryPoints.toFixed(1)}`)
    const completionRate = data.summary.totalStoryPoints > 0
      ? (data.summary.closedStoryPoints / data.summary.totalStoryPoints * 100).toFixed(1)
      : '0'
    parts.push(`- Velocity Rate: ${completionRate}%`)
    parts.push('')
  }

  // Recent Issues (top 10 for context)
  if (data.recentIssues && data.recentIssues.length > 0) {
    parts.push(`**Recent Issues (Sample):**`)
    data.recentIssues.slice(0, 10).forEach(issue => {
      parts.push(`- ${issue.key}: ${issue.summary} [${issue.status}${issue.storyPoints ? `, ${issue.storyPoints} pts` : ''}]`)
    })
  }

  return parts.join('\n')
}
