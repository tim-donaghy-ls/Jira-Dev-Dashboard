import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DashboardPage from './page';
import * as api from '@/lib/api';
import * as XLSX from 'xlsx';

// Mock the API functions
vi.mock('@/lib/api', () => ({
  fetchDashboardData: vi.fn(),
  testConnection: vi.fn(),
  fetchInstances: vi.fn(),
  fetchProjects: vi.fn(),
  fetchSprints: vi.fn(),
  fetchIssueDetails: vi.fn(),
}));

// Mock XLSX
vi.mock('xlsx', () => ({
  default: {
    utils: {
      book_new: vi.fn(() => ({})),
      aoa_to_sheet: vi.fn(() => ({})),
      book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
  },
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

// Mock all components to simplify testing
vi.mock('@/components/Header', () => ({
  Header: ({ connectionStatus, connectionMessage }: any) => (
    <div data-testid="header">
      <div data-testid="connection-status">{connectionStatus}</div>
      <div data-testid="connection-message">{connectionMessage}</div>
    </div>
  ),
}));

vi.mock('@/components/Controls', () => ({
  Controls: ({ onLoad, selectedInstance, setSelectedInstance, selectedProject, setSelectedProject, selectedSprint, setSelectedSprint }: any) => (
    <div data-testid="controls">
      <button onClick={onLoad} data-testid="load-button">Load Dashboard</button>
      <select data-testid="instance-select" value={selectedInstance} onChange={(e) => setSelectedInstance(e.target.value)}>
        <option value="">Select Instance</option>
        <option value="instance1">Instance 1</option>
      </select>
      <select data-testid="project-select" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
        <option value="">Select Project</option>
        <option value="PROJ1">Project 1</option>
      </select>
      <select data-testid="sprint-select" value={selectedSprint} onChange={(e) => setSelectedSprint(e.target.value)}>
        <option value="">Select Sprint</option>
        <option value="123">Sprint 1</option>
        <option value="all">All Sprints</option>
      </select>
    </div>
  ),
}));

vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('@/components/ErrorMessage', () => ({
  ErrorMessage: ({ message }: any) => <div data-testid="error-message">{message}</div>,
}));

vi.mock('@/components/SummaryCards', () => ({
  SummaryCards: ({ data }: any) => <div data-testid="summary-cards">Total: {data.totalIssues}</div>,
}));

vi.mock('@/components/ChartsOverview', () => ({
  ChartsOverview: () => <div data-testid="charts-overview">Charts</div>,
}));

vi.mock('@/components/TeamPerformanceTable', () => ({
  TeamPerformanceTable: () => <div data-testid="team-performance">Team Performance</div>,
}));

vi.mock('@/components/DeveloperWorkload', () => ({
  DeveloperWorkload: () => <div data-testid="developer-workload">Developer Workload</div>,
}));

vi.mock('@/components/IssueCard', () => ({
  IssueCard: ({ issue }: any) => <div data-testid={`issue-${issue.key}`}>{issue.summary}</div>,
}));

vi.mock('@/components/StoryPointsWarning', () => ({
  StoryPointsWarning: () => <div data-testid="story-points-warning">Warning</div>,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;
global.alert = vi.fn();

const mockDashboardData = {
  summary: {
    totalIssues: 10,
    openIssues: 5,
    closedIssues: 5,
    totalStoryPoints: 25,
  },
  statusBreakdown: { 'In Progress': 5, Done: 5 },
  priorityBreakdown: { High: 3, Medium: 7 },
  assigneeStats: [],
  recentIssues: [
    {
      key: 'TEST-1',
      summary: 'Test Issue 1',
      status: 'In Progress',
      priority: 'High',
      assignee: 'John Doe',
      storyPoints: 5,
      created: '2024-01-01',
      updated: '2024-01-02',
      description: 'Test description',
      issueType: 'Story',
    },
    {
      key: 'TEST-2',
      summary: 'Test Issue 2',
      status: 'Done',
      priority: 'Medium',
      assignee: 'Jane Smith',
      storyPoints: 3,
      created: '2024-01-01',
      updated: '2024-01-02',
      description: 'Another test',
      issueType: 'Bug',
    },
  ],
  allIssues: [],
  jiraBaseUrl: 'https://test.atlassian.net',
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Initial Rendering', () => {
    it('should render the page with controls', () => {
      render(<DashboardPage />);
      expect(screen.getByTestId('controls')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should show connection status as checking initially', () => {
      render(<DashboardPage />);
      expect(screen.getByTestId('connection-status')).toHaveTextContent('checking');
    });

    it('should render Test Application footer link', () => {
      render(<DashboardPage />);
      const link = screen.getByText('Test Application');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/tests');
    });

    it('should show initial message when no data loaded', () => {
      render(<DashboardPage />);
      expect(screen.getByText('Select a project and sprint to load the dashboard')).toBeInTheDocument();
    });
  });

  describe('Connection Testing', () => {
    it('should test connection when instance is selected', async () => {
      vi.mocked(api.testConnection).mockResolvedValueOnce({
        success: true,
      });

      render(<DashboardPage />);

      const instanceSelect = screen.getByTestId('instance-select');
      fireEvent.change(instanceSelect, { target: { value: 'instance1' } });

      await waitFor(() => {
        expect(api.testConnection).toHaveBeenCalledWith('instance1');
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
        expect(screen.getByTestId('connection-message')).toHaveTextContent('Connected to JIRA');
      });
    });

    it('should show error when connection fails', async () => {
      vi.mocked(api.testConnection).mockResolvedValueOnce({
        success: false,
        error: 'Connection timeout',
      });

      render(<DashboardPage />);

      const instanceSelect = screen.getByTestId('instance-select');
      fireEvent.change(instanceSelect, { target: { value: 'instance1' } });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('error');
        expect(screen.getByTestId('error-message')).toHaveTextContent('Connection timeout');
      });
    });

    it('should handle connection errors gracefully', async () => {
      vi.mocked(api.testConnection).mockRejectedValueOnce(new Error('Network error'));

      render(<DashboardPage />);

      const instanceSelect = screen.getByTestId('instance-select');
      fireEvent.change(instanceSelect, { target: { value: 'instance1' } });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('error');
        expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');
      });
    });
  });

  describe('Loading Dashboard Data', () => {
    it('should require project selection before loading', async () => {
      // Since we removed the Load button and added auto-load on selection,
      // this test now verifies that the dashboard doesn't auto-load without selections
      render(<DashboardPage />);

      // Wait a moment to ensure no auto-load happens
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(api.fetchDashboardData).not.toHaveBeenCalled();
      expect(screen.getByText('Select a project and sprint to load the dashboard')).toBeInTheDocument();
    });

    it('should fetch dashboard data when all fields are filled', async () => {
      vi.mocked(api.testConnection).mockResolvedValue({ success: true });
      vi.mocked(api.fetchDashboardData).mockResolvedValue(mockDashboardData);

      render(<DashboardPage />);

      // Select instance
      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      // Select project
      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });

      // Select sprint
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });

      // Click load
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(api.fetchDashboardData).toHaveBeenCalledWith({
          instance: 'instance1',
          project: 'PROJ1',
          sprint: '123',
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('summary-cards')).toBeInTheDocument();
        expect(screen.getByTestId('charts-overview')).toBeInTheDocument();
        expect(screen.getByTestId('team-performance')).toBeInTheDocument();
      });
    });

    it('should show loading spinner while fetching', async () => {
      vi.mocked(api.testConnection).mockResolvedValue({ success: true });
      vi.mocked(api.fetchDashboardData).mockImplementation(() => new Promise(() => {}));

      render(<DashboardPage />);

      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });
    });

    it('should handle fetch errors', async () => {
      vi.mocked(api.testConnection).mockResolvedValue({ success: true });
      vi.mocked(api.fetchDashboardData).mockRejectedValue(new Error('Failed to fetch'));

      render(<DashboardPage />);

      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to fetch');
      });
    });
  });

  describe('Sprint Tickets Filtering', () => {
    beforeEach(async () => {
      vi.mocked(api.testConnection).mockResolvedValue({ success: true });
      vi.mocked(api.fetchDashboardData).mockResolvedValue(mockDashboardData);
    });

    it('should display all sprint tickets by default', async () => {
      render(<DashboardPage />);

      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(screen.getByTestId('issue-TEST-1')).toBeInTheDocument();
        expect(screen.getByTestId('issue-TEST-2')).toBeInTheDocument();
      });
    });

    it('should filter tickets by developer', async () => {
      render(<DashboardPage />);

      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(screen.getByTestId('issue-TEST-1')).toBeInTheDocument();
      });

      // Filter by developer
      const developerFilter = screen.getByLabelText('Filter by Developer:');
      fireEvent.change(developerFilter, { target: { value: 'John Doe' } });

      await waitFor(() => {
        expect(screen.getByTestId('issue-TEST-1')).toBeInTheDocument();
        expect(screen.queryByTestId('issue-TEST-2')).not.toBeInTheDocument();
      });
    });

    it.skip('should filter tickets by keyword', async () => {
      render(<DashboardPage />);

      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(screen.getByTestId('issue-TEST-1')).toBeInTheDocument();
      });

      // Filter by keyword
      const keywordFilter = screen.getByLabelText('Search:');
      fireEvent.change(keywordFilter, { target: { value: 'Bug' } });

      // Immediate re-render, no need to wait
      expect(screen.queryByTestId('issue-TEST-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('issue-TEST-2')).toBeInTheDocument();
    }, 2000);

    it('should show message when no issues match filters', async () => {
      render(<DashboardPage />);

      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(screen.getByTestId('issue-TEST-1')).toBeInTheDocument();
      });

      // Filter with non-matching keyword
      const keywordFilter = screen.getByLabelText('Search:');
      fireEvent.change(keywordFilter, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No issues found matching the current filters.')).toBeInTheDocument();
      });
    });
  });

  describe('Export Sprint Tickets', () => {
    beforeEach(async () => {
      vi.mocked(api.testConnection).mockResolvedValue({ success: true });
      vi.mocked(api.fetchDashboardData).mockResolvedValue(mockDashboardData);
    });

    it('should open menu when action button clicked', async () => {
      render(<DashboardPage />);

      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(screen.getByTestId('issue-TEST-1')).toBeInTheDocument();
      });

      const actionButton = screen.getByTitle('Actions');
      fireEvent.click(actionButton);

      await waitFor(() => {
        expect(screen.getByText('Export Tickets in Sprint')).toBeInTheDocument();
        expect(screen.getByText('Create Release Notes')).toBeInTheDocument();
      });
    });

    it('should export tickets to Excel when export clicked', async () => {
      render(<DashboardPage />);

      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(screen.getByTestId('issue-TEST-1')).toBeInTheDocument();
      });

      const actionButton = screen.getByTitle('Actions');
      fireEvent.click(actionButton);

      // Menu opens immediately
      expect(screen.getByText('Export Tickets in Sprint')).toBeInTheDocument();

      const exportButton = screen.getByText('Export Tickets in Sprint');
      fireEvent.click(exportButton);

      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.writeFile).toHaveBeenCalled();
    }, 2000);

    it('should show alert when trying to export with no tickets', async () => {
      vi.mocked(api.fetchDashboardData).mockResolvedValue({
        ...mockDashboardData,
        recentIssues: [],
      });

      render(<DashboardPage />);

      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(screen.getByText('No issues found')).toBeInTheDocument();
      });

      const actionButton = screen.getByTitle('Actions');
      fireEvent.click(actionButton);

      const exportButton = screen.getByText('Export Tickets in Sprint');
      fireEvent.click(exportButton);

      expect(global.alert).toHaveBeenCalledWith('No tickets to export');
    });
  });

  describe('Generate Release Notes', () => {
    beforeEach(async () => {
      vi.mocked(api.testConnection).mockResolvedValue({ success: true });
      vi.mocked(api.fetchDashboardData).mockResolvedValue(mockDashboardData);
    });

    it('should call API to generate release notes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ releaseNotes: '## Release Notes\n\nTest content' }),
      });

      // Mock blob and URL methods
      const mockBlob = new Blob(['test'], { type: 'text/markdown' });
      global.Blob = vi.fn(() => mockBlob) as any;
      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();

      render(<DashboardPage />);

      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(screen.getByTestId('issue-TEST-1')).toBeInTheDocument();
      });

      const actionButton = screen.getByTitle('Actions');
      fireEvent.click(actionButton);

      const releaseNotesButton = screen.getByText('Create Release Notes');
      fireEvent.click(releaseNotesButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/generate-release-notes',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('should show alert when release notes generation fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'API key not configured' }),
      });

      render(<DashboardPage />);

      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(screen.getByTestId('issue-TEST-1')).toBeInTheDocument();
      });

      const actionButton = screen.getByTitle('Actions');
      fireEvent.click(actionButton);

      const releaseNotesButton = screen.getByText('Create Release Notes');
      fireEvent.click(releaseNotesButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('API key not configured'));
      });
    });
  });

  describe('Sprint Info Display', () => {
    it('should display sprint information when available', async () => {
      vi.mocked(api.testConnection).mockResolvedValue({ success: true });
      vi.mocked(api.fetchDashboardData).mockResolvedValue({
        ...mockDashboardData,
        sprintInfo: {
          name: 'Sprint 25',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
        },
      });

      render(<DashboardPage />);

      fireEvent.change(screen.getByTestId('instance-select'), { target: { value: 'instance1' } });
      await waitFor(() => expect(api.testConnection).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId('project-select'), { target: { value: 'PROJ1' } });
      fireEvent.change(screen.getByTestId('sprint-select'), { target: { value: '123' } });
      fireEvent.click(screen.getByTestId('load-button'));

      await waitFor(() => {
        expect(screen.getByText('Sprint 25')).toBeInTheDocument();
      });
    });
  });
});
