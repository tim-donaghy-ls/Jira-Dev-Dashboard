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

    const prompt = `You are a technical writer creating release notes for a software sprint. Below are the JIRA tickets from ${sprintName || 'this sprint'}. Analyze these tickets and create professional release notes with the following sections:

1. **New Features**: Major new functionality added
2. **Improvements & Enhancements**: Updates to existing features
3. **Bug Fixes**: Issues that were resolved

For each section:
- Group related items together
- Use clear, non-technical language where possible
- Focus on user impact rather than technical details
- Be concise but informative

Here are the tickets:

${ticketSummaries}

Please generate the release notes now in markdown format.`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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
