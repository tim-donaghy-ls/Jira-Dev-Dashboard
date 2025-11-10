import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const { dashboardData, sprintName } = await request.json()

    if (!dashboardData) {
      return NextResponse.json(
        { error: 'No dashboard data provided' },
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

    const anthropic = new Anthropic({
      apiKey: apiKey,
    })

    // Log what we received for debugging
    console.log('Dashboard Data Keys:', Object.keys(dashboardData))
    console.log('All Issues count:', dashboardData.allIssues?.length || 0)
    console.log('Recent Issues count:', dashboardData.recentIssues?.length || 0)
    console.log('Summary:', dashboardData.summary)
    console.log('Assignee stats:', dashboardData.assigneeStats?.length || 0)

    // Format dashboard data for analysis - TICKETS FIRST to ensure they're included
    const allTickets = dashboardData.allIssues || []
    const ticketCount = allTickets.length
    const ticketsText = ticketCount > 0
      ? allTickets.slice(0, 20).map((issue: any, index: number) =>
          `TICKET #${index + 1}: ${issue.key}\nTITLE: ${issue.summary}\nSTATUS: ${issue.status || 'N/A'} | POINTS: ${issue.storyPoints || 0}\nDESCRIPTION: ${issue.description || 'No description'}\n---`
        ).join('\n')
      : 'No tickets found - Sprint may be empty or data not loaded'

    const dataContext = `
=== SPRINT TICKETS (${ticketCount} total) ===
${ticketsText}

=== SPRINT METRICS ===
Sprint: ${sprintName || 'N/A'} (${dashboardData.sprintInfo?.state || 'N/A'})
Total Issues: ${dashboardData.summary?.totalIssues || 0} | Completed/Done: ${dashboardData.summary?.closedIssues || 0} | In Progress: ${dashboardData.summary?.inProgressIssues || 0}
Total Story Points: ${dashboardData.summary?.totalStoryPoints || 0} | Completed/Done: ${dashboardData.summary?.closedStoryPoints || 0} | In Progress: ${dashboardData.summary?.inProgressStoryPoints || 0}

NOTE: "Production Release" status means tickets are DONE and deployed. Count these as completed when calculating completion rates.

=== TEAM PERFORMANCE ===
${dashboardData.assigneeStats && dashboardData.assigneeStats.length > 0
  ? dashboardData.assigneeStats.map((dev: any) => {
      const completionRate = dev.totalIssues > 0 ? Math.round((dev.closedIssues / dev.totalIssues) * 100) : 0
      return `${dev.name}: ${completionRate}% completion, ${dev.totalStoryPoints || 0} points, ${dev.closedIssues || 0}/${dev.totalIssues || 0} issues`
    }).join('\n')
  : 'No team performance data available'}

=== ISSUE BREAKDOWN ===
By Status: ${dashboardData.statusBreakdown ? Object.entries(dashboardData.statusBreakdown).map(([status, count]) => `${status}:${count}`).join(', ') : 'No status data'}
By Priority: ${dashboardData.priorityBreakdown ? Object.entries(dashboardData.priorityBreakdown).map(([priority, count]) => `${priority}:${count}`).join(', ') : 'No priority data'}

=== SPRINT SLIPPAGE ===
${dashboardData.slippageData?.slippedIssues?.length > 0
  ? `Slipped: ${dashboardData.slippageData.slippedIssues.length} issues, ${dashboardData.slippageData.totalSlippedStoryPoints || 0} points`
  : 'No slippage detected'}
`

    // Log the context for debugging
    console.log('Data context length:', dataContext.length)
    console.log('First 500 chars:', dataContext.substring(0, 500))

    const prompt = `STEP 1: First, analyze this sprint data and extract the key facts:

${dataContext}

STEP 2: Now answer these questions based on ONLY the data above:

Q1: How many total issues are there? How many completed? How many in progress?
Q2: How many total story points? How many completed? How many in progress?
Q3: List each developer's name, completion rate, and story points (from TEAM PERFORMANCE)
Q4: How many issues slipped? How many story points slipped?
Q5: List the first 5 tickets' TICKET ID, TITLE, and what business value they provide based on their DESCRIPTION

STEP 3: Using your answers above, write this executive summary:

# Executive Summary: ${sprintName || 'Sprint'}

## Sprint Overview (3 bullets)
Use your answers to Q1 and Q2 to write 3 specific bullets with exact numbers. Example format:
- "Delivered [X] of [Y] tickets, achieving [Z]% completion rate"
- "Team completed [X] story points out of [Y] committed"
- "Sprint concluded with [X] items completed and [Y] remaining"

## Performance Insights (3 bullets)
From ISSUE BREAKDOWN data, write 3 bullets with specific facts about:
- Work type distribution (use actual numbers from the data)
- Status breakdown (use actual numbers)
- Team capacity observations

## Team Contributions (3-4 bullets)
Use your answer to Q3. Write 3-4 bullets:
- List top 2-3 performers with their EXACT completion rates and story points
- Mention overall team productivity with specific numbers

## Delivery Analysis (1-2 bullets)
Use your answer to Q4. Write 1-2 bullets with exact numbers about slippage

## Business Value Delivered (3-5 bullets)
Use your answer to Q5. For each ticket, transform its TITLE and DESCRIPTION into a business value statement.

DO NOT write generic statements. Use the ACTUAL ticket information.

Example: If ticket is "Add export feature" with description "Allow users to export data to Excel", write: "Enabled data export to Excel, improving user workflow integration and data portability"

CRITICAL: Every bullet must contain SPECIFIC information from the data. If you write generic statements without specific facts, numbers, or ticket details, you have FAILED.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Extract the text content from Claude's response
    const analysis = message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n')

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Error generating sprint analysis:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate sprint analysis' },
      { status: 500 }
    )
  }
}
