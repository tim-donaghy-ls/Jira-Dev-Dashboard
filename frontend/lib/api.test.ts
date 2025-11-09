import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchInstances,
  testConnection,
  fetchProjects,
  fetchSprints,
  fetchDashboardData,
  fetchIssueDetails,
} from './api';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
  });

  describe('fetchInstances', () => {
    it('should fetch JIRA instances successfully', async () => {
      const mockResponse = {
        instances: [
          { id: 'instance1', name: 'Instance 1' },
          { id: 'instance2', name: 'Instance 2' },
        ],
        count: 2,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchInstances();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/instances');
      expect(result).toEqual(mockResponse);
      expect(result.instances).toHaveLength(2);
    });

    it('should throw error on failed fetch', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Failed to fetch instances',
      });

      await expect(fetchInstances()).rejects.toThrow('Failed to fetch instances');
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const mockResponse = { success: true };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await testConnection('instance1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/test-connection?instance=instance1'
      );
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
    });

    it('should handle connection failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Connection failed',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await testConnection('instance1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });

    it('should encode special characters in instance ID', async () => {
      const mockResponse = { success: true };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await testConnection('instance with spaces');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/test-connection?instance=instance%20with%20spaces'
      );
    });
  });

  describe('fetchProjects', () => {
    it('should fetch projects for an instance', async () => {
      const mockResponse = {
        projects: [
          { key: 'PROJ1', name: 'Project 1' },
          { key: 'PROJ2', name: 'Project 2' },
        ],
        count: 2,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchProjects('instance1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/projects?instance=instance1'
      );
      expect(result).toEqual(mockResponse);
      expect(result.projects).toHaveLength(2);
    });

    it('should handle empty projects list', async () => {
      const mockResponse = {
        projects: [],
        count: 0,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchProjects('instance1');

      expect(result.projects).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('fetchSprints', () => {
    it('should fetch sprints for a project', async () => {
      const mockResponse = {
        sprints: [
          { id: 1, name: 'Sprint 1', state: 'active' },
          { id: 2, name: 'Sprint 2', state: 'future' },
        ],
        count: 2,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchSprints('instance1', 'PROJ1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/sprints?instance=instance1&project=PROJ1'
      );
      expect(result).toEqual(mockResponse);
      expect(result.sprints).toHaveLength(2);
    });

    it('should encode project key properly', async () => {
      const mockResponse = {
        sprints: [],
        count: 0,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await fetchSprints('instance1', 'PROJ-TEST');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/sprints?instance=instance1&project=PROJ-TEST'
      );
    });
  });

  describe('fetchDashboardData', () => {
    it('should fetch dashboard data with all filters', async () => {
      const mockData = {
        summary: {
          totalIssues: 10,
          openIssues: 5,
          closedIssues: 5,
        },
        statusBreakdown: {},
        priorityBreakdown: {},
        assigneeStats: [],
        recentIssues: [],
        allIssues: [],
        jiraBaseUrl: 'https://test.atlassian.net',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchDashboardData({
        instance: 'instance1',
        project: 'PROJ1',
        sprint: '123',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/dashboard?instance=instance1&project=PROJ1&sprint=123'
      );
      expect(result).toEqual(mockData);
    });

    it('should fetch dashboard data without sprint filter', async () => {
      const mockData = {
        summary: {
          totalIssues: 10,
          openIssues: 5,
          closedIssues: 5,
        },
        statusBreakdown: {},
        priorityBreakdown: {},
        assigneeStats: [],
        recentIssues: [],
        allIssues: [],
        jiraBaseUrl: 'https://test.atlassian.net',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchDashboardData({
        instance: 'instance1',
        project: 'PROJ1',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/dashboard?instance=instance1&project=PROJ1'
      );
      expect(result).toEqual(mockData);
    });

    it('should not add sprint parameter when sprint is "all"', async () => {
      const mockData = {
        summary: {
          totalIssues: 10,
          openIssues: 5,
          closedIssues: 5,
        },
        statusBreakdown: {},
        priorityBreakdown: {},
        assigneeStats: [],
        recentIssues: [],
        allIssues: [],
        jiraBaseUrl: 'https://test.atlassian.net',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await fetchDashboardData({
        instance: 'instance1',
        project: 'PROJ1',
        sprint: 'all',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/dashboard?instance=instance1&project=PROJ1'
      );
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Dashboard fetch failed',
      });

      await expect(
        fetchDashboardData({
          instance: 'instance1',
          project: 'PROJ1',
        })
      ).rejects.toThrow('Dashboard fetch failed');
    });
  });

  describe('fetchIssueDetails', () => {
    it('should fetch issue details successfully', async () => {
      const mockDetails = {
        statusHistory: [
          {
            status: 'In Progress',
            timestamp: '2024-01-01T10:00:00Z',
            fromStatus: 'To Do',
          },
          {
            status: 'Done',
            timestamp: '2024-01-02T10:00:00Z',
            fromStatus: 'In Progress',
          },
        ],
        inProgressToQADays: 2.5,
        developmentTimeDays: 3.0,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetails,
      });

      const result = await fetchIssueDetails('instance1', 'PROJ-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/issue/PROJ-123?instance=instance1'
      );
      expect(result).toEqual(mockDetails);
      expect(result.statusHistory).toHaveLength(2);
      expect(result.developmentTimeDays).toBe(3.0);
    });

    it('should handle issue with no status history', async () => {
      const mockDetails = {
        statusHistory: [],
        inProgressToQADays: 0,
        developmentTimeDays: 0,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetails,
      });

      const result = await fetchIssueDetails('instance1', 'PROJ-456');

      expect(result.statusHistory).toHaveLength(0);
    });

    it('should throw error when issue not found', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Issue not found',
      });

      await expect(
        fetchIssueDetails('instance1', 'INVALID-1')
      ).rejects.toThrow('Issue not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(fetchInstances()).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON responses', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(fetchInstances()).rejects.toThrow('Invalid JSON');
    });
  });
});
