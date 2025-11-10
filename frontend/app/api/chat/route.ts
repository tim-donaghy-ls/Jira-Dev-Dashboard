import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { DashboardData } from '@/types'

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
2. Generate Word documents (.docx format) - for reports, summaries, meeting notes
3. Generate Excel spreadsheets (.xlsx format) - for data tables, metrics, analysis
4. Generate PowerPoint presentations (.pptx format) - for presentations, status reports
5. Generate code snippets and configuration files when specifically requested
6. Export data in CSV, JSON, or other formats

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

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Extract text response
    const answer = message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n')

    return NextResponse.json({ answer })
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
