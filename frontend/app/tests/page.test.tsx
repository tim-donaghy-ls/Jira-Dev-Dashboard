import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TestDashboardPage from './page';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TestDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Initial Rendering', () => {
    it('should render the page title', () => {
      render(<TestDashboardPage />);
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
    });

    it('should render the page description', () => {
      render(<TestDashboardPage />);
      expect(screen.getByText('Run and monitor application tests')).toBeInTheDocument();
    });

    it('should render back to dashboard link', () => {
      render(<TestDashboardPage />);
      const backLink = screen.getByText('← Back to Dashboard');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/');
    });

    it('should render all test run buttons', () => {
      render(<TestDashboardPage />);
      expect(screen.getByText('Run All Tests')).toBeInTheDocument();
      expect(screen.getByText('Run Backend Tests')).toBeInTheDocument();
      expect(screen.getByText('Run Frontend Tests')).toBeInTheDocument();
      expect(screen.getByText('Run E2E Tests')).toBeInTheDocument();
    });

    it('should show empty state when no tests run', () => {
      render(<TestDashboardPage />);
      expect(screen.getByText('No tests run yet')).toBeInTheDocument();
      expect(screen.getByText('Click one of the buttons above to run tests')).toBeInTheDocument();
    });

    it('should display frontend test note', () => {
      render(<TestDashboardPage />);
      expect(screen.getByText(/Frontend tests must be run separately/)).toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('should have all buttons enabled initially', () => {
      render(<TestDashboardPage />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should disable all buttons while loading', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<TestDashboardPage />);

      const runAllButton = screen.getByText('Run All Tests');
      fireEvent.click(runAllButton);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
          expect(button).toBeDisabled();
        });
      });
    });

    it('should show "Running..." text while loading', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      render(<TestDashboardPage />);

      const runAllButton = screen.getByText('Run All Tests');
      fireEvent.click(runAllButton);

      await waitFor(() => {
        expect(screen.getByText('Running...')).toBeInTheDocument();
      });
    });
  });

  describe('Running Tests', () => {
    it('should call API when Run All Tests is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [],
          overallStats: {
            totalTests: 0,
            passed: 0,
            failed: 0,
            status: 'passed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      const button = screen.getByText('Run All Tests');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/tests');
      });
    });

    it('should call API with backend type when Run Backend Tests is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [],
          overallStats: {
            totalTests: 0,
            passed: 0,
            failed: 0,
            status: 'passed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      const button = screen.getByText('Run Backend Tests');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/tests?type=backend');
      });
    });

    it('should call API with frontend type when Run Frontend Tests is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [],
          overallStats: {
            totalTests: 0,
            passed: 0,
            failed: 0,
            status: 'passed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      const button = screen.getByText('Run Frontend Tests');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/tests?type=frontend');
      });
    });

    it('should call API with e2e type when Run E2E Tests is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [],
          overallStats: {
            totalTests: 0,
            passed: 0,
            failed: 0,
            status: 'passed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      const button = screen.getByText('Run E2E Tests');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/tests?type=e2e');
      });
    });
  });

  describe('Test Results Display', () => {
    it.skip('should display overall stats when tests complete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [],
          overallStats: {
            totalTests: 100,
            passed: 85,
            failed: 15,
            status: 'failed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      const button = screen.getByText('Run All Tests');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('85')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('FAILED')).toBeInTheDocument();
      }, { timeout: 2000 });
    }, 3000);

    it('should display test suites when data is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [
            {
              category: 'unit',
              type: 'backend',
              testType: 'Go Unit Tests',
              totalTests: 10,
              passed: 8,
              failed: 2,
              duration: '2.5s',
              coverage: '75.5%',
              coverageFloat: 75.5,
              tests: [],
              status: 'failed',
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
          ],
          overallStats: {
            totalTests: 10,
            passed: 8,
            failed: 2,
            status: 'failed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      const button = screen.getByText('Run All Tests');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Go Unit Tests')).toBeInTheDocument();
        expect(screen.getByText(/75.5% Coverage/)).toBeInTheDocument();
        expect(screen.getByText(/10 tests • 8 passed • 2 failed • 2.5s/)).toBeInTheDocument();
      });
    });

    it('should toggle suite expansion when clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [
            {
              category: 'unit',
              type: 'backend',
              testType: 'Go Unit Tests',
              totalTests: 1,
              passed: 1,
              failed: 0,
              duration: '1s',
              coverage: '80%',
              coverageFloat: 80,
              tests: [
                {
                  name: 'TestExample',
                  status: 'passed',
                  duration: 1000000000,
                },
              ],
              status: 'passed',
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
          ],
          overallStats: {
            totalTests: 1,
            passed: 1,
            failed: 0,
            status: 'passed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      const button = screen.getByText('Run All Tests');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Go Unit Tests')).toBeInTheDocument();
      });

      // Initially, test details should not be visible
      expect(screen.queryByText('TestExample')).not.toBeInTheDocument();

      // Click to expand
      const suiteHeader = screen.getByText('Go Unit Tests').closest('button');
      fireEvent.click(suiteHeader!);

      // Now test details should be visible
      await waitFor(() => {
        expect(screen.getByText('TestExample')).toBeInTheDocument();
      });

      // Click again to collapse
      fireEvent.click(suiteHeader!);

      // Test details should be hidden again
      await waitFor(() => {
        expect(screen.queryByText('TestExample')).not.toBeInTheDocument();
      });
    });

    it('should display coverage badge when coverage is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [
            {
              category: 'unit',
              type: 'backend',
              testType: 'Backend Tests',
              totalTests: 1,
              passed: 1,
              failed: 0,
              duration: '1s',
              coverage: '85.2%',
              coverageFloat: 85.2,
              tests: [],
              status: 'passed',
              startedAt: new Date().toISOString(),
            },
          ],
          overallStats: {
            totalTests: 1,
            passed: 1,
            failed: 0,
            status: 'passed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      fireEvent.click(screen.getByText('Run All Tests'));

      await waitFor(() => {
        expect(screen.getByText('85.2% Coverage')).toBeInTheDocument();
      });
    });

    it('should not display coverage badge when coverage is N/A', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [
            {
              category: 'e2e',
              type: 'frontend',
              testType: 'E2E Tests',
              totalTests: 5,
              passed: 5,
              failed: 0,
              duration: '10s',
              coverage: 'N/A',
              coverageFloat: 0,
              tests: [],
              status: 'passed',
              startedAt: new Date().toISOString(),
            },
          ],
          overallStats: {
            totalTests: 5,
            passed: 5,
            failed: 0,
            status: 'passed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      fireEvent.click(screen.getByText('Run All Tests'));

      await waitFor(() => {
        expect(screen.getByText('E2E Tests')).toBeInTheDocument();
        expect(screen.queryByText(/N\/A Coverage/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      });

      render(<TestDashboardPage />);
      fireEvent.click(screen.getByText('Run All Tests'));

      await waitFor(() => {
        expect(screen.getByText('Test Execution Failed')).toBeInTheDocument();
        expect(screen.getByText(/Failed to run tests/)).toBeInTheDocument();
      });
    });

    it('should display error message when network error occurs', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<TestDashboardPage />);
      fireEvent.click(screen.getByText('Run All Tests'));

      await waitFor(() => {
        expect(screen.getByText('Test Execution Failed')).toBeInTheDocument();
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('should clear error when new test run is started', async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      render(<TestDashboardPage />);
      fireEvent.click(screen.getByText('Run All Tests'));

      await waitFor(() => {
        expect(screen.getByText('Test Execution Failed')).toBeInTheDocument();
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [],
          overallStats: {
            totalTests: 0,
            passed: 0,
            failed: 0,
            status: 'passed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      fireEvent.click(screen.getByText('Run All Tests'));

      await waitFor(() => {
        expect(screen.queryByText('Test Execution Failed')).not.toBeInTheDocument();
      });
    });
  });

  describe('Status Colors and Icons', () => {
    it.skip('should use green color for passed status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [],
          overallStats: {
            totalTests: 10,
            passed: 10,
            failed: 0,
            status: 'passed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      fireEvent.click(screen.getByText('Run All Tests'));

      await waitFor(() => {
        const statusElement = screen.getByText('PASSED');
        expect(statusElement).toHaveClass('text-green-600');
      }, { timeout: 2000 });
    }, 3000);

    it.skip('should use red color for failed status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [],
          overallStats: {
            totalTests: 10,
            passed: 5,
            failed: 5,
            status: 'failed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      fireEvent.click(screen.getByText('Run All Tests'));

      await waitFor(() => {
        const statusElement = screen.getByText('FAILED');
        expect(statusElement).toHaveClass('text-red-600');
      }, { timeout: 2000 });
    }, 3000);
  });

  describe('Test Details', () => {
    it('should display individual test results when suite is expanded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [
            {
              category: 'unit',
              type: 'backend',
              testType: 'Backend Tests',
              totalTests: 2,
              passed: 1,
              failed: 1,
              duration: '2s',
              coverage: '80%',
              coverageFloat: 80,
              tests: [
                {
                  name: 'TestSuccess',
                  status: 'passed',
                  duration: 1000000000,
                },
                {
                  name: 'TestFailure',
                  status: 'failed',
                  duration: 500000000,
                  error: 'Expected true but got false',
                },
              ],
              status: 'failed',
              startedAt: new Date().toISOString(),
            },
          ],
          overallStats: {
            totalTests: 2,
            passed: 1,
            failed: 1,
            status: 'failed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      fireEvent.click(screen.getByText('Run All Tests'));

      await waitFor(() => {
        expect(screen.getByText('Backend Tests')).toBeInTheDocument();
      });

      // Expand suite
      const suiteHeader = screen.getByText('Backend Tests').closest('button');
      fireEvent.click(suiteHeader!);

      await waitFor(() => {
        expect(screen.getByText('TestSuccess')).toBeInTheDocument();
        expect(screen.getByText('TestFailure')).toBeInTheDocument();
        expect(screen.getByText('Expected true but got false')).toBeInTheDocument();
      });
    });

    it('should display test duration in seconds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [
            {
              category: 'unit',
              type: 'backend',
              testType: 'Tests',
              totalTests: 1,
              passed: 1,
              failed: 0,
              duration: '1s',
              coverage: 'N/A',
              coverageFloat: 0,
              tests: [
                {
                  name: 'TestWithDuration',
                  status: 'passed',
                  duration: 2500000000, // 2.5 seconds in nanoseconds
                },
              ],
              status: 'passed',
              startedAt: new Date().toISOString(),
            },
          ],
          overallStats: {
            totalTests: 1,
            passed: 1,
            failed: 0,
            status: 'passed',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      fireEvent.click(screen.getByText('Run All Tests'));

      await waitFor(() => {
        expect(screen.getByText('Tests')).toBeInTheDocument();
      });

      const suiteHeader = screen.getByText('Tests').closest('button');
      fireEvent.click(suiteHeader!);

      await waitFor(() => {
        expect(screen.getByText('2.50s')).toBeInTheDocument();
      });
    });

    it('should handle suites with no test results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suites: [
            {
              category: 'unit',
              type: 'backend',
              testType: 'Empty Tests',
              totalTests: 0,
              passed: 0,
              failed: 0,
              duration: '0s',
              coverage: 'N/A',
              coverageFloat: 0,
              tests: [],
              status: 'skipped',
              startedAt: new Date().toISOString(),
            },
          ],
          overallStats: {
            totalTests: 0,
            passed: 0,
            failed: 0,
            status: 'skipped',
          },
          lastRun: new Date().toISOString(),
        }),
      });

      render(<TestDashboardPage />);
      fireEvent.click(screen.getByText('Run All Tests'));

      await waitFor(() => {
        expect(screen.getByText('Empty Tests')).toBeInTheDocument();
      });

      const suiteHeader = screen.getByText('Empty Tests').closest('button');
      fireEvent.click(suiteHeader!);

      await waitFor(() => {
        expect(screen.getByText('No test results available')).toBeInTheDocument();
      });
    });
  });
});
