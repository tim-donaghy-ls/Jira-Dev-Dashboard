import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const { tickets, sprintName } = await request.json()

    if (!tickets || tickets.length === 0) {
      return NextResponse.json(
        { error: 'No tickets provided' },
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

    // Format tickets for Claude
    const ticketSummaries = tickets.map((ticket: any) => {
      return `**${ticket.key}**: ${ticket.summary}
Type: ${ticket.issueType || 'N/A'}
Status: ${ticket.status || 'N/A'}
Priority: ${ticket.priority || 'N/A'}
${ticket.description ? `Description: ${ticket.description.substring(0, 500)}${ticket.description.length > 500 ? '...' : ''}` : ''}`
    }).join('\n\n---\n\n')

    const prompt = `You are a technical writer creating release notes for a software sprint. Below are the JIRA tickets from ${sprintName || 'this sprint'}.

Create professional, concise release notes formatted for email communication with the following structure:

**Subject Line:** Release Notes - ${sprintName || 'Sprint'} - [Current Date]

**Email Body:**

Dear Team,

We're pleased to share the release notes for ${sprintName || 'this sprint'}. Here's what we've delivered:

## New Features
[Summarize the major new functionality added. DO NOT include JIRA ticket keys. Group related items together and write concise bullet points (1 sentence each) that focus on user value and business impact. Use clear, non-technical language.]

## Improvements & Enhancements
[Summarize updates to existing features. DO NOT include JIRA ticket keys. Group related improvements together and highlight user benefits in concise bullet points.]

## Bug Fixes
[Summarize issues that were resolved. DO NOT include JIRA ticket keys. Group similar fixes together and keep descriptions brief and non-technical.]

## Summary
[Provide a brief closing paragraph (2-3 sentences) highlighting the sprint's key accomplishments and overall impact.]

Best regards,
[Your Team Name]

---

IMPORTANT INSTRUCTIONS:
- DO NOT include any JIRA ticket keys (like "PROJ-123") in the output
- Create concise, summarized bullet points that group similar items together
- Focus on the "what" and "why" from a user perspective
- Keep each bullet point to 1 sentence
- Make the content professional and ready to send via email

Here are the tickets to analyze and summarize:

${ticketSummaries}

Please generate the release notes now following the format above.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Extract the text content from Claude's response
    const releaseNotes = message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n')

    return NextResponse.json({ releaseNotes })
  } catch (error) {
    console.error('Error generating release notes:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate release notes' },
      { status: 500 }
    )
  }
}
