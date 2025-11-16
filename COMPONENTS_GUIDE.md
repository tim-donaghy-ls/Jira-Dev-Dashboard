# JIRA Dev Dashboard - Component Documentation Guide

## Table of Contents
1. [Overview](#overview)
2. [Component Architecture](#component-architecture)
3. [Core Components](#core-components)
4. [Data Visualization Components](#data-visualization-components)
5. [UI Components](#ui-components)
6. [Custom Hooks](#custom-hooks)
7. [Context Providers](#context-providers)
8. [Component Usage Examples](#component-usage-examples)
9. [Styling Guidelines](#styling-guidelines)
10. [Testing Components](#testing-components)

---

## Overview

The JIRA Dev Dashboard frontend is built with **React 19.2.0** and **Next.js 16.0.1** using the App Router pattern. All components are written in **TypeScript** for type safety and use **Tailwind CSS** for styling.

### Component Organization

```
frontend/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Main dashboard page
│   └── layout.tsx           # Root layout
├── components/              # Reusable React components
│   ├── TeamPerformanceTable.tsx
│   ├── SprintTicketsTable.tsx
│   ├── Controls.tsx
│   ├── Charts/              # (conceptual grouping)
│   └── UI/                  # (conceptual grouping)
├── hooks/                   # Custom React hooks
│   └── useJiraData.ts
├── context/                 # React Context providers
│   └── ThemeContext.tsx
├── lib/                     # Utility functions
│   └── utils.ts
└── types/                   # TypeScript type definitions
    └── index.ts
```

---

## Component Architecture

### Component Hierarchy

```
Dashboard (page.tsx)
│
├─ Header
│  ├─ Logo/Title
│  ├─ ThemeToggle
│  └─ UserMenu
│
├─ Controls
│  ├─ InstanceSelector (Dropdown)
│  ├─ ProjectSelector (Dropdown)
│  └─ SprintSelector (Dropdown)
│
├─ ConnectionStatus
│
├─ SummaryCards
│  ├─ TotalIssuesCard
│  ├─ CompletedIssuesCard
│  ├─ StoryPointsCard
│  └─ CompletionRateCard
│
├─ ChartsOverview
│  ├─ StatusChart (Pie/Donut chart)
│  ├─ PriorityChart (Bar chart)
│  ├─ DeveloperStoryPointsChart (Bar chart)
│  ├─ DeveloperDevTimeChart (Bar chart)
│  ├─ DeveloperWorkload (Stacked bar)
│  └─ SprintSlippage (Line chart)
│
├─ TeamPerformanceTable
│  ├─ DeveloperRow (expandable)
│  │  └─ SprintMetricsRow (nested)
│  ├─ RatingTooltip
│  └─ ExportButton
│
└─ SprintTicketsTable
   ├─ IssueCard (list item)
   │  └─ AhaVerificationBadge
   ├─ FilterControls
   ├─ ExportButton
   ├─ ReleaseNotesModal
   └─ ChatDrawer
```

### Component Design Principles

1. **Single Responsibility**: Each component has one clear purpose
2. **Composability**: Small components compose into larger features
3. **Reusability**: Components can be used in multiple contexts
4. **Type Safety**: Full TypeScript coverage with proper interfaces
5. **Accessibility**: ARIA labels and keyboard navigation support
6. **Responsive Design**: Mobile-first approach with Tailwind breakpoints

---

## Core Components

### Dashboard Page

**File:** [app/page.tsx](../JIRA-Dev-Dashboard/frontend/app/page.tsx)

**Purpose:** Main application entry point that orchestrates all dashboard functionality.

**Key Responsibilities:**
- Fetch dashboard data using `useJiraData` hook
- Manage filter state (instance, project, sprint)
- Handle loading and error states
- Render all dashboard sections

**Props:** None (Next.js page component)

**State:**
```typescript
const [selectedInstance, setSelectedInstance] = useState<string>('primary');
const [selectedProject, setSelectedProject] = useState<string>('');
const [selectedSprint, setSelectedSprint] = useState<string>('');
```

**Example Usage:**
```typescript
export default function DashboardPage() {
  const { data, loading, error } = useJiraData(
    selectedInstance,
    selectedProject,
    selectedSprint
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="dashboard-container">
      <Header />
      <Controls
        onInstanceChange={setSelectedInstance}
        onProjectChange={setSelectedProject}
        onSprintChange={setSelectedSprint}
      />
      <SummaryCards data={data.summary} />
      <ChartsOverview data={data} />
      <TeamPerformanceTable data={data.developerMetrics} />
      <SprintTicketsTable issues={data.issues} />
    </div>
  );
}
```

---

### TeamPerformanceTable

**File:** [components/TeamPerformanceTable.tsx](../JIRA-Dev-Dashboard/frontend/components/TeamPerformanceTable.tsx)

**Purpose:** Display developer performance metrics with 5-star ratings and expandable sprint breakdowns.

**Props:**
```typescript
interface TeamPerformanceTableProps {
  data: DeveloperMetric[];
  loading?: boolean;
}

interface DeveloperMetric {
  developer: string;
  totalIssues: number;
  completedIssues: number;
  storyPointsCompleted: number;
  averageDevTime: number;
  completionRate: number;
  qualityScore: number;
  recoveryRate: number;
  rating: number;  // 0-5 stars
  sprintBreakdown?: SprintMetric[];
}
```

**Key Features:**
- 5-star rating system with weighted scoring
- Expandable rows showing sprint-by-sprint metrics
- Tooltips explaining rating calculations
- Excel export functionality
- Sortable columns

**Rating Calculation:**
```typescript
const calculateRating = (metrics: DeveloperMetric): number => {
  const weights = {
    storyPoints: 0.30,      // 30%
    completionRate: 0.25,   // 25%
    devTime: 0.20,          // 20%
    qualityScore: 0.15,     // 15%
    recoveryRate: 0.10      // 10%
  };

  // Normalize each metric to 0-5 scale
  const storyPointsScore = normalizeStoryPoints(metrics.storyPointsCompleted);
  const completionScore = metrics.completionRate / 20;  // 100% = 5 stars
  const devTimeScore = normalizeDevTime(metrics.averageDevTime);
  const qualityScoreNorm = metrics.qualityScore / 20;
  const recoveryScoreNorm = metrics.recoveryRate / 20;

  return (
    storyPointsScore * weights.storyPoints +
    completionScore * weights.completionRate +
    devTimeScore * weights.devTime +
    qualityScoreNorm * weights.qualityScore +
    recoveryScoreNorm * weights.recoveryRate
  );
};
```

**Example Usage:**
```typescript
<TeamPerformanceTable
  data={dashboardData.developerMetrics}
  loading={loading}
/>
```

**Excel Export:**
```typescript
const exportToExcel = () => {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Team Summary
  const summaryData = data.map(dev => ({
    'Developer': dev.developer,
    'Rating': '⭐'.repeat(Math.round(dev.rating)),
    'Story Points': dev.storyPointsCompleted,
    'Completion Rate': `${dev.completionRate}%`,
    'Avg Dev Time': `${dev.averageDevTime} days`
  }));

  const ws1 = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, ws1, 'Team Summary');

  // Generate and download
  XLSX.writeFile(workbook, 'team-performance.xlsx');
};
```

---

### SprintTicketsTable

**File:** [components/SprintTicketsTable.tsx](../JIRA-Dev-Dashboard/frontend/components/SprintTicketsTable.tsx)

**Purpose:** Display all sprint tickets with filtering, sorting, and AI-powered features.

**Props:**
```typescript
interface SprintTicketsTableProps {
  issues: Issue[];
  sprint?: Sprint;
  loading?: boolean;
}

interface Issue {
  key: string;
  summary: string;
  description?: string;
  status: string;
  priority: string;
  issueType: string;
  assignee?: string;
  reporter: string;
  created: string;
  updated: string;
  resolved?: string;
  storyPoints?: number;
  labels: string[];
  developmentTimeDays?: number;
  ahaFeature?: AhaFeature;
}
```

**Key Features:**
- Filterable by status, assignee, priority, type
- Sortable by any column
- Excel export
- AI-powered release notes generation
- Aha! feature verification badges
- Clickable links to JIRA

**Filter Implementation:**
```typescript
const [filters, setFilters] = useState({
  status: '',
  assignee: '',
  priority: '',
  type: ''
});

const filteredIssues = useMemo(() => {
  return issues.filter(issue => {
    if (filters.status && issue.status !== filters.status) return false;
    if (filters.assignee && issue.assignee !== filters.assignee) return false;
    if (filters.priority && issue.priority !== filters.priority) return false;
    if (filters.type && issue.issueType !== filters.type) return false;
    return true;
  });
}, [issues, filters]);
```

**Example Usage:**
```typescript
<SprintTicketsTable
  issues={dashboardData.issues}
  sprint={dashboardData.sprintInfo}
  loading={loading}
/>
```

---

### Controls

**File:** [components/Controls.tsx](../JIRA-Dev-Dashboard/frontend/components/Controls.tsx)

**Purpose:** Filter controls for selecting JIRA instance, project, and sprint.

**Props:**
```typescript
interface ControlsProps {
  instances: Instance[];
  projects: Project[];
  sprints: Sprint[];
  selectedInstance: string;
  selectedProject: string;
  selectedSprint: string;
  onInstanceChange: (instanceId: string) => void;
  onProjectChange: (projectKey: string) => void;
  onSprintChange: (sprintId: string) => void;
}
```

**Key Features:**
- Dropdown selectors for each filter
- Loading states while fetching options
- Disabled states for dependent dropdowns
- Responsive layout

**Example Usage:**
```typescript
<Controls
  instances={availableInstances}
  projects={availableProjects}
  sprints={availableSprints}
  selectedInstance={selectedInstance}
  selectedProject={selectedProject}
  selectedSprint={selectedSprint}
  onInstanceChange={(id) => setSelectedInstance(id)}
  onProjectChange={(key) => setSelectedProject(key)}
  onSprintChange={(id) => setSelectedSprint(id)}
/>
```

---

### SummaryCards

**File:** [components/SummaryCards.tsx](../JIRA-Dev-Dashboard/frontend/components/SummaryCards.tsx)

**Purpose:** Display key metrics at a glance using card-based layout.

**Props:**
```typescript
interface SummaryCardsProps {
  data: SummaryData;
}

interface SummaryData {
  totalIssues: number;
  completedIssues: number;
  inProgressIssues: number;
  todoIssues: number;
  completionRate: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  averageDevTime: number;
}
```

**Card Types:**
1. **Total Issues** - Count of all issues in sprint
2. **Completed Issues** - Count and percentage
3. **Story Points** - Completed vs. Total
4. **Completion Rate** - Percentage with visual indicator

**Example Usage:**
```typescript
<SummaryCards data={dashboardData.summary} />
```

---

## Data Visualization Components

### StatusChart

**File:** [components/StatusChart.tsx](../JIRA-Dev-Dashboard/frontend/components/StatusChart.tsx)

**Purpose:** Visualize issue status distribution using a donut chart.

**Props:**
```typescript
interface StatusChartProps {
  data: Record<string, number>;  // { "Done": 45, "In Progress": 3, "To Do": 2 }
}
```

**Chart Library:** Recharts

**Example:**
```typescript
<StatusChart data={dashboardData.statusDistribution} />
```

---

### PriorityChart

**File:** [components/PriorityChart.tsx](../JIRA-Dev-Dashboard/frontend/components/PriorityChart.tsx)

**Purpose:** Visualize issue priority distribution using a bar chart.

**Props:**
```typescript
interface PriorityChartProps {
  data: Record<string, number>;  // { "High": 10, "Medium": 30, "Low": 10 }
}
```

**Example:**
```typescript
<PriorityChart data={dashboardData.priorityDistribution} />
```

---

### DeveloperStoryPointsChart

**File:** [components/DeveloperStoryPointsChart.tsx](../JIRA-Dev-Dashboard/frontend/components/DeveloperStoryPointsChart.tsx)

**Purpose:** Compare story points completed by each developer.

**Props:**
```typescript
interface DeveloperStoryPointsChartProps {
  data: Array<{
    developer: string;
    storyPointsCompleted: number;
  }>;
}
```

**Features:**
- Horizontal bar chart
- Color-coded bars by performance tier
- Tooltip showing exact values

**Example:**
```typescript
<DeveloperStoryPointsChart data={dashboardData.developerMetrics} />
```

---

### DeveloperDevTimeChart

**File:** [components/DeveloperDevTimeChart.tsx](../JIRA-Dev-Dashboard/frontend/components/DeveloperDevTimeChart.tsx)

**Purpose:** Compare average development time per developer.

**Props:**
```typescript
interface DeveloperDevTimeChartProps {
  data: Array<{
    developer: string;
    averageDevTime: number;  // in days
  }>;
}
```

**Features:**
- Bar chart with time axis
- Color-coded: green (fast), yellow (average), red (slow)
- Benchmark line showing team average

**Example:**
```typescript
<DeveloperDevTimeChart data={dashboardData.developerMetrics} />
```

---

### DeveloperWorkload

**File:** [components/DeveloperWorkload.tsx](../JIRA-Dev-Dashboard/frontend/components/DeveloperWorkload.tsx)

**Purpose:** Visualize current workload per developer (To Do, In Progress, Done).

**Props:**
```typescript
interface DeveloperWorkloadProps {
  data: Array<{
    developer: string;
    todo: number;
    inProgress: number;
    done: number;
  }>;
}
```

**Features:**
- Stacked bar chart
- Status-based coloring
- Identifies overloaded developers

**Example:**
```typescript
<DeveloperWorkload data={workloadData} />
```

---

### SprintSlippage

**File:** [components/SprintSlippage.tsx](../JIRA-Dev-Dashboard/frontend/components/SprintSlippage.tsx)

**Purpose:** Track sprint progress over time showing slippage trends.

**Props:**
```typescript
interface SprintSlippageProps {
  data: Array<{
    date: string;
    planned: number;
    completed: number;
  }>;
}
```

**Features:**
- Line chart with dual axes
- Ideal burndown line
- Actual completion line
- Highlights slippage areas

**Example:**
```typescript
<SprintSlippage data={sprintTrendData} />
```

---

## UI Components

### Header

**File:** [components/Header.tsx](../JIRA-Dev-Dashboard/frontend/components/Header.tsx)

**Purpose:** Application header with branding and user controls.

**Props:**
```typescript
interface HeaderProps {
  title?: string;
  showUserMenu?: boolean;
}
```

**Features:**
- Application title/logo
- Theme toggle button
- User menu dropdown

**Example:**
```typescript
<Header title="JIRA Dev Dashboard" showUserMenu={true} />
```

---

### ThemeToggle

**File:** [components/ThemeToggle.tsx](../JIRA-Dev-Dashboard/frontend/components/ThemeToggle.tsx)

**Purpose:** Toggle between light and dark mode.

**Props:** None (uses ThemeContext)

**Implementation:**
```typescript
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
};
```

**Example:**
```typescript
<ThemeToggle />
```

---

### LoadingSpinner

**File:** [components/LoadingSpinner.tsx](../JIRA-Dev-Dashboard/frontend/components/LoadingSpinner.tsx)

**Purpose:** Display loading state with animated spinner.

**Props:**
```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}
```

**Example:**
```typescript
<LoadingSpinner size="large" message="Loading dashboard data..." />
```

---

### ErrorMessage

**File:** [components/ErrorMessage.tsx](../JIRA-Dev-Dashboard/frontend/components/ErrorMessage.tsx)

**Purpose:** Display error messages with retry option.

**Props:**
```typescript
interface ErrorMessageProps {
  error: string | Error;
  onRetry?: () => void;
}
```

**Example:**
```typescript
<ErrorMessage
  error="Failed to fetch dashboard data"
  onRetry={() => refetch()}
/>
```

---

### ConnectionStatus

**File:** [components/ConnectionStatus.tsx](../JIRA-Dev-Dashboard/frontend/components/ConnectionStatus.tsx)

**Purpose:** Display real-time connection status to backend services.

**Props:**
```typescript
interface ConnectionStatusProps {
  connected: boolean;
  service?: string;
}
```

**Features:**
- Color-coded status indicator (green/red)
- Animated pulse when checking
- Tooltip with details

**Example:**
```typescript
<ConnectionStatus connected={isConnected} service="JIRA" />
```

---

### ReleaseNotesModal

**File:** [components/ReleaseNotesModal.tsx](../JIRA-Dev-Dashboard/frontend/components/ReleaseNotesModal.tsx)

**Purpose:** Modal dialog for AI-generated release notes.

**Props:**
```typescript
interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: Issue[];
  sprint: Sprint;
}
```

**Features:**
- AI-powered release note generation
- Loading state during generation
- Copy to clipboard button
- Markdown rendering
- Download as .md file

**Example:**
```typescript
<ReleaseNotesModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  issues={selectedIssues}
  sprint={currentSprint}
/>
```

---

### ChatDrawer

**File:** [components/ChatDrawer.tsx](../JIRA-Dev-Dashboard/frontend/components/ChatDrawer.tsx)

**Purpose:** Slide-out chat interface for AI assistant.

**Props:**
```typescript
interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context: DashboardContext;
}
```

**Features:**
- Streaming AI responses
- Chat history
- Context-aware answers
- Markdown message rendering

**Example:**
```typescript
<ChatDrawer
  isOpen={showChat}
  onClose={() => setShowChat(false)}
  context={{ project: 'PROJ', sprint: 'Sprint 45', data: dashboardData }}
/>
```

---

### IssueCard

**File:** [components/IssueCard.tsx](../JIRA-Dev-Dashboard/frontend/components/IssueCard.tsx)

**Purpose:** Display individual issue/ticket information.

**Props:**
```typescript
interface IssueCardProps {
  issue: Issue;
  onClick?: (issue: Issue) => void;
}
```

**Features:**
- Clickable to open in JIRA
- Status badge
- Priority indicator
- Assignee avatar
- Story points display
- Aha! feature badge

**Example:**
```typescript
<IssueCard
  issue={issue}
  onClick={(issue) => window.open(issue.url, '_blank')}
/>
```

---

### AhaVerificationBadge

**File:** [components/AhaVerificationBadge.tsx](../JIRA-Dev-Dashboard/frontend/components/AhaVerificationBadge.tsx)

**Purpose:** Display Aha! feature verification status.

**Props:**
```typescript
interface AhaVerificationBadgeProps {
  ahaFeature?: AhaFeature;
}

interface AhaFeature {
  id: string;
  name: string;
  verified: boolean;
  url: string;
}
```

**Display States:**
- ✅ Verified - Green badge with link
- ❌ Not Verified - Red badge
- ⚠️ Unknown - Yellow badge

**Example:**
```typescript
<AhaVerificationBadge ahaFeature={issue.ahaFeature} />
```

---

## Custom Hooks

### useJiraData

**File:** [hooks/useJiraData.ts](../JIRA-Dev-Dashboard/frontend/hooks/useJiraData.ts)

**Purpose:** Centralized hook for fetching JIRA dashboard data.

**Signature:**
```typescript
function useJiraData(
  instance: string,
  project: string,
  sprint: string
): {
  data: DashboardData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**Features:**
- Automatic refetch on parameter change
- Loading state management
- Error handling
- Request deduplication
- Caching support

**Implementation:**
```typescript
export const useJiraData = (instance: string, project: string, sprint: string) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!project) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        instance,
        project,
        ...(sprint && { sprint })
      });

      const response = await fetch(`/api/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');

      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [instance, project, sprint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
```

**Example Usage:**
```typescript
const Dashboard = () => {
  const [project, setProject] = useState('PROJ');
  const [sprint, setSprint] = useState('123');

  const { data, loading, error, refetch } = useJiraData(
    'primary',
    project,
    sprint
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;

  return <div>{/* Render dashboard with data */}</div>;
};
```

---

## Context Providers

### ThemeContext

**File:** [context/ThemeContext.tsx](../JIRA-Dev-Dashboard/frontend/context/ThemeContext.tsx)

**Purpose:** Global theme state management (dark/light mode).

**Context Value:**
```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

**Implementation:**
```typescript
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.add(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.remove(theme);
    document.documentElement.classList.add(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

**Hook:**
```typescript
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

**Example Usage:**
```typescript
// In app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

// In any component
const MyComponent = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      Current theme: {theme}
    </button>
  );
};
```

---

## Component Usage Examples

### Complete Dashboard Example

```typescript
// app/page.tsx
'use client';

import { useState } from 'react';
import { useJiraData } from '@/hooks/useJiraData';
import Header from '@/components/Header';
import Controls from '@/components/Controls';
import SummaryCards from '@/components/SummaryCards';
import TeamPerformanceTable from '@/components/TeamPerformanceTable';
import SprintTicketsTable from '@/components/SprintTicketsTable';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

export default function Dashboard() {
  const [instance, setInstance] = useState('primary');
  const [project, setProject] = useState('');
  const [sprint, setSprint] = useState('');

  const { data, loading, error, refetch } = useJiraData(instance, project, sprint);

  if (loading) {
    return <LoadingSpinner size="large" message="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={refetch} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="JIRA Dev Dashboard" />

      <main className="container mx-auto px-4 py-8">
        <Controls
          instances={data.instances}
          projects={data.projects}
          sprints={data.sprints}
          selectedInstance={instance}
          selectedProject={project}
          selectedSprint={sprint}
          onInstanceChange={setInstance}
          onProjectChange={setProject}
          onSprintChange={setSprint}
        />

        <SummaryCards data={data.summary} />

        <div className="mt-8">
          <TeamPerformanceTable data={data.developerMetrics} />
        </div>

        <div className="mt-8">
          <SprintTicketsTable
            issues={data.issues}
            sprint={data.sprintInfo}
          />
        </div>
      </main>
    </div>
  );
}
```

---

## Styling Guidelines

### Tailwind CSS Classes

**Container Layout:**
```typescript
<div className="container mx-auto px-4 py-8">
  {/* Content */}
</div>
```

**Card Style:**
```typescript
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
  {/* Card content */}
</div>
```

**Button Styles:**
```typescript
// Primary button
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Click Me
</button>

// Secondary button
<button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
  Cancel
</button>
```

**Responsive Grid:**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Cards */}
</div>
```

### Dark Mode Support

All components must support dark mode using Tailwind's `dark:` variant:

```typescript
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  {/* Content adapts to theme */}
</div>
```

---

## Testing Components

### Unit Testing with Vitest

**Example Test:**
```typescript
// components/SummaryCards.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SummaryCards from './SummaryCards';

describe('SummaryCards', () => {
  it('renders all summary cards', () => {
    const data = {
      totalIssues: 50,
      completedIssues: 45,
      completionRate: 90,
      totalStoryPoints: 150
    };

    render(<SummaryCards data={data} />);

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });
});
```

### E2E Testing with Playwright

**Example Test:**
```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard loads and displays data', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Wait for dashboard to load
  await expect(page.locator('h1')).toContainText('JIRA Dev Dashboard');

  // Check summary cards
  await expect(page.locator('[data-testid="total-issues"]')).toBeVisible();

  // Check table loads
  await expect(page.locator('[data-testid="team-performance-table"]')).toBeVisible();
});
```

---

## Best Practices

### Component Design

1. **Keep components focused** - One component, one responsibility
2. **Use TypeScript interfaces** - Define prop types explicitly
3. **Handle loading states** - Show spinners during async operations
4. **Handle error states** - Display user-friendly error messages
5. **Make components accessible** - Use ARIA labels and semantic HTML
6. **Support keyboard navigation** - All interactions should work without mouse

### Performance Optimization

1. **Use React.memo** - For expensive components
2. **Use useMemo** - For expensive calculations
3. **Use useCallback** - For stable function references
4. **Lazy load heavy components** - Use React.lazy() and Suspense
5. **Virtualize long lists** - Use react-window for 100+ items

### Code Style

1. **Consistent naming** - PascalCase for components, camelCase for functions
2. **Clear prop names** - Descriptive and self-documenting
3. **Extract constants** - Don't hardcode magic numbers
4. **Add comments** - Explain complex logic
5. **Use ESLint** - Follow project linting rules

---

**Last Updated:** November 2025
**Version:** 1.0
**Maintainer:** Development Team
