'use client';

import { useState } from 'react';
import Link from 'next/link';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'running' | 'skipped';
  duration: number;
  output?: string;
  error?: string;
}

interface TestSuite {
  category: 'unit' | 'integration' | 'e2e';
  type: 'backend' | 'frontend';
  testType: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: string;
  coverage: string;
  coverageFloat: number;
  tests: TestResult[];
  status: 'passed' | 'failed' | 'running' | 'skipped';
  startedAt: string;
  completedAt?: string;
}

interface TestDashboardData {
  suites: TestSuite[];
  overallStats: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'passed' | 'failed' | 'skipped';
  };
  lastRun: string;
}

export default function TestDashboardPage() {
  const [testData, setTestData] = useState<TestDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [currentTestType, setCurrentTestType] = useState<string | null>(null);

  const runTests = async (type?: string) => {
    setLoading(true);
    setError(null);
    setCurrentTestType(type || 'all');

    try {
      const url = type
        ? `http://localhost:8080/api/tests?type=${type}`
        : 'http://localhost:8080/api/tests';

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to run tests: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();
      setTestData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run tests');
    } finally {
      setLoading(false);
      setCurrentTestType(null);
    }
  };

  const toggleSuite = (suiteKey: string) => {
    const newExpanded = new Set(expandedSuites);
    if (newExpanded.has(suiteKey)) {
      newExpanded.delete(suiteKey);
    } else {
      newExpanded.add(suiteKey);
    }
    setExpandedSuites(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'running':
        return 'text-blue-600 dark:text-blue-400';
      case 'skipped':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700';
      case 'running':
        return 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700';
      case 'skipped':
        return 'bg-gray-100 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return '✓';
      case 'failed':
        return '✗';
      case 'running':
        return '⟳';
      case 'skipped':
        return '○';
      default:
        return '?';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'unit':
        return 'Unit Tests';
      case 'integration':
        return 'Integration Tests';
      case 'e2e':
        return 'End-to-End Tests';
      default:
        return category;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Test Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Run and monitor application tests
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Run Tests Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Run Tests
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => runTests()}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Running...' : 'Run All Tests'}
            </button>
            <button
              onClick={() => runTests('backend')}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Run Backend Tests
            </button>
            <button
              onClick={() => runTests('frontend')}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Run Frontend Tests
            </button>
            <button
              onClick={() => runTests('e2e')}
              disabled={loading}
              className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Run E2E Tests
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Note: Frontend tests must be run separately from the frontend
            directory using <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">npm test -- --run</code>
          </p>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-8 mb-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Running {currentTestType === 'all' ? 'All' : currentTestType === 'backend' ? 'Backend' : currentTestType === 'frontend' ? 'Frontend' : currentTestType === 'e2e' ? 'E2E' : ''} Tests
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Please wait while the tests are executing...
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  This may take a few moments depending on the test suite size
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                  Test Execution Failed
                </h3>
                <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-3 rounded font-mono whitespace-pre-wrap break-words">
                  {error}
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-3">
                  Please check the error details above and try again. Common issues include:
                </p>
                <ul className="text-xs text-red-600 dark:text-red-400 mt-1 ml-4 list-disc space-y-1">
                  <li>Backend server not running or not accessible</li>
                  <li>Test dependencies not installed (run npm install or go mod tidy)</li>
                  <li>Test files have syntax errors or missing imports</li>
                  <li>Insufficient permissions or locked test files</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Overall Stats */}
        {testData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`rounded-lg border-2 p-6 ${getStatusBg(testData.overallStats.status)}`}>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Overall Status
              </h3>
              <p className={`text-3xl font-bold ${getStatusColor(testData.overallStats.status)}`}>
                {getStatusIcon(testData.overallStats.status)}{' '}
                {testData.overallStats.status.toUpperCase()}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Total Tests
              </h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {testData.overallStats.totalTests}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Passed
              </h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {testData.overallStats.passed}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Failed
              </h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {testData.overallStats.failed}
              </p>
            </div>
          </div>
        )}

        {/* Test Suites - Organized by Type */}
        {testData && testData.suites && testData.suites.length > 0 && (
          <div className="space-y-6">
            {/* Backend Unit Tests Section */}
            {testData.suites.filter(s => s.type === 'backend').length > 0 && (
              <div className="space-y-4">
                {testData.suites
                  .filter((suite) => suite.type === 'backend')
                  .map((suite, suiteIndex) => {
                    const suiteKey = `backend-${suiteIndex}`;
                    const isExpanded = expandedSuites.has(suiteKey);

                    return (
                      <div
                        key={suiteKey}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
                      >
                        {/* Suite Header */}
                        <button
                          onClick={() => toggleSuite(suiteKey)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <span
                              className={`text-2xl font-bold ${getStatusColor(suite.status)}`}
                            >
                              {getStatusIcon(suite.status)}
                            </span>
                            <div className="text-left">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {suite.testType || `${getCategoryLabel(suite.category)} - ${suite.type.charAt(0).toUpperCase() + suite.type.slice(1)}`}
                                </h3>
                                {suite.coverage && suite.coverage !== 'N/A' && suite.coverage !== 'Coverage not configured' && (
                                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-full">
                                    {suite.coverage} Coverage
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {suite.totalTests} tests • {suite.passed} passed •{' '}
                                {suite.failed} failed • {suite.duration}
                              </p>
                            </div>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-500 transform transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {/* Suite Details */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                            {suite.tests.length > 0 ? (
                              <div className="space-y-2">
                                {suite.tests.map((test, testIndex) => (
                                  <div
                                    key={testIndex}
                                    className={`p-3 rounded border-l-4 ${
                                      test.status === 'passed' ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10' :
                                      test.status === 'failed' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' :
                                      test.status === 'skipped' ? 'border-l-gray-400 bg-gray-50 dark:bg-gray-900/10' :
                                      'border-l-gray-300 bg-gray-50 dark:bg-gray-900/10'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <span
                                          className={`text-lg font-bold ${getStatusColor(test.status)}`}
                                        >
                                          {getStatusIcon(test.status)}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                          {test.name}
                                        </span>
                                      </div>
                                      {test.duration > 0 && (
                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                          {(test.duration / 1000000000).toFixed(2)}s
                                        </span>
                                      )}
                                    </div>
                                    {test.error && (
                                      <div className="mt-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded">
                                        <strong>Error:</strong> {test.error}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                No test results available
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Frontend Unit Tests Section */}
            {testData.suites.filter(s => s.type === 'frontend' && s.category === 'unit').length > 0 && (
              <div className="space-y-4">
                {testData.suites
                  .filter((suite) => suite.type === 'frontend' && suite.category === 'unit')
                  .map((suite, suiteIndex) => {
                    const suiteKey = `frontend-${suiteIndex}`;
                    const isExpanded = expandedSuites.has(suiteKey);

                    return (
                      <div
                        key={suiteKey}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
                      >
                        {/* Suite Header */}
                        <button
                          onClick={() => toggleSuite(suiteKey)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <span
                              className={`text-2xl font-bold ${getStatusColor(suite.status)}`}
                            >
                              {getStatusIcon(suite.status)}
                            </span>
                            <div className="text-left">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {suite.testType || `${getCategoryLabel(suite.category)} - ${suite.type.charAt(0).toUpperCase() + suite.type.slice(1)}`}
                                </h3>
                                {suite.coverage && suite.coverage !== 'N/A' && suite.coverage !== 'Coverage not configured' && (
                                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-full">
                                    {suite.coverage} Coverage
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {suite.totalTests} tests • {suite.passed} passed •{' '}
                                {suite.failed} failed • {suite.duration}
                              </p>
                            </div>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-500 transform transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {/* Suite Details */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                            {suite.tests.length > 0 ? (
                              <div className="space-y-2">
                                {suite.tests.map((test, testIndex) => (
                                  <div
                                    key={testIndex}
                                    className={`p-3 rounded border-l-4 ${
                                      test.status === 'passed' ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10' :
                                      test.status === 'failed' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' :
                                      test.status === 'skipped' ? 'border-l-gray-400 bg-gray-50 dark:bg-gray-900/10' :
                                      'border-l-gray-300 bg-gray-50 dark:bg-gray-900/10'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <span
                                          className={`text-lg font-bold ${getStatusColor(test.status)}`}
                                        >
                                          {getStatusIcon(test.status)}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                          {test.name}
                                        </span>
                                      </div>
                                      {test.duration > 0 && (
                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                          {(test.duration / 1000000000).toFixed(2)}s
                                        </span>
                                      )}
                                    </div>
                                    {test.error && (
                                      <div className="mt-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded">
                                        <strong>Error:</strong> {test.error}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                No test results available
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* E2E (Playwright) Tests Section */}
            {testData.suites.filter(s => s.category === 'e2e').length > 0 && (
              <div className="space-y-4">
                {testData.suites
                  .filter((suite) => suite.category === 'e2e')
                  .map((suite, suiteIndex) => {
                    const suiteKey = `e2e-${suiteIndex}`;
                    const isExpanded = expandedSuites.has(suiteKey);

                    return (
                      <div
                        key={suiteKey}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
                      >
                        {/* Suite Header */}
                        <button
                          onClick={() => toggleSuite(suiteKey)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <span
                              className={`text-2xl font-bold ${getStatusColor(suite.status)}`}
                            >
                              {getStatusIcon(suite.status)}
                            </span>
                            <div className="text-left">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {suite.testType || `${getCategoryLabel(suite.category)} - ${suite.type.charAt(0).toUpperCase() + suite.type.slice(1)}`}
                                </h3>
                                {suite.coverage && suite.coverage !== 'N/A' && suite.coverage !== 'Coverage not configured' ? (
                                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-full">
                                    {suite.coverage} Coverage
                                  </span>
                                ) : suite.totalTests > 0 && (
                                  <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-semibold rounded-full">
                                    {suite.totalTests} UI Flows
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {suite.totalTests} tests • {suite.passed} passed •{' '}
                                {suite.failed} failed • {suite.duration}
                              </p>
                            </div>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-500 transform transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {/* Suite Details */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                            {suite.tests.length > 0 ? (
                              <div className="space-y-2">
                                {suite.tests.map((test, testIndex) => (
                                  <div
                                    key={testIndex}
                                    className={`p-3 rounded border-l-4 ${
                                      test.status === 'passed' ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10' :
                                      test.status === 'failed' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' :
                                      test.status === 'skipped' ? 'border-l-gray-400 bg-gray-50 dark:bg-gray-900/10' :
                                      'border-l-gray-300 bg-gray-50 dark:bg-gray-900/10'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <span
                                          className={`text-lg font-bold ${getStatusColor(test.status)}`}
                                        >
                                          {getStatusIcon(test.status)}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                          {test.name}
                                        </span>
                                      </div>
                                      {test.duration > 0 && (
                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                          {(test.duration / 1000000000).toFixed(2)}s
                                        </span>
                                      )}
                                    </div>
                                    {test.error && (
                                      <div className="mt-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded">
                                        <strong>Error:</strong> {test.error}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                No test results available
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!testData && !loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No tests run yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Click one of the buttons above to run tests
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
