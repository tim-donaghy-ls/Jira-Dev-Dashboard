'use client'

import { DashboardSummary } from '@/types'

interface SummaryCardsProps {
  data: DashboardSummary
  jiraBaseUrl?: string
  sprintId?: string
  projectKey?: string
}

export function SummaryCards({ data, jiraBaseUrl, sprintId, projectKey }: SummaryCardsProps) {
  // Build JQL query for sprint filter
  const buildJqlUrl = (filterType?: 'open' | 'closed') => {
    if (!jiraBaseUrl || !sprintId) return undefined

    let jql = `sprint=${sprintId}`
    if (projectKey) {
      jql += ` AND project=${projectKey}`
    }
    if (filterType === 'open') {
      jql += ` AND status!="Production Release"`
    } else if (filterType === 'closed') {
      jql += ` AND status="Production Release"`
    }

    return `${jiraBaseUrl}/issues/?jql=${encodeURIComponent(jql)}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
      <Card
        title="Total Issues"
        value={data.totalIssues}
        subtext={`${data.totalStoryPoints.toFixed(1)} story points`}
        href={buildJqlUrl()}
      />
      <Card
        title="Open"
        value={data.openIssues}
        subtext={`${data.openStoryPoints.toFixed(1)} story points`}
        href={buildJqlUrl('open')}
      />
      <Card
        title="Closed"
        value={data.closedIssues}
        subtext={`${data.closedStoryPoints.toFixed(1)} story points`}
        href={buildJqlUrl('closed')}
      />
      <Card
        title="AVG Dev Time (Tickets)"
        value={`${data.avgResolutionDays.toFixed(1)} days`}
        href={buildJqlUrl('closed')}
      />
      <Card
        title="Total Story Points"
        value={data.totalStoryPoints.toFixed(1)}
        href={buildJqlUrl()}
      />
    </div>
  )
}

interface CardProps {
  title: string
  value: string | number
  subtext?: string
  href?: string
}

function Card({ title, value, subtext, href }: CardProps) {
  const content = (
    <>
      <div className="text-sm font-semibold text-secondary uppercase tracking-wide mb-2.5">
        {title}
      </div>
      <div className="text-[32px] font-bold text-primary leading-none mb-1">
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-muted">
          {subtext}
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-card shadow-card border border-custom rounded-lg p-5 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer block"
      >
        {content}
      </a>
    )
  }

  return (
    <div className="bg-card shadow-card border border-custom rounded-lg p-5 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
      {content}
    </div>
  )
}
