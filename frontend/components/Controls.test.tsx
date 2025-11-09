import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Controls } from './Controls'
import * as api from '@/lib/api'

// Mock the API module
vi.mock('@/lib/api', () => ({
  fetchInstances: vi.fn(),
  fetchProjects: vi.fn(),
  fetchSprints: vi.fn(),
}))

const mockInstances = {
  instances: [
    { id: 'primary', name: 'Primary Instance' },
    { id: 'secondary', name: 'Secondary Instance' },
  ],
}

const mockProjects = {
  projects: [
    { key: 'PROJ1', name: 'Project 1' },
    { key: 'PROJ2', name: 'Project 2' },
    { key: 'PROJ3', name: 'CLX LS-CLX Platform' },
  ],
}

const mockSprints = {
  sprints: [
    { id: 101, name: 'Sprint 101', state: 'active' },
    { id: 100, name: 'Sprint 100', state: 'closed' },
    { id: 102, name: 'Sprint 102', state: 'future' },
  ],
}

describe('Controls', () => {
  const mockSetSelectedInstance = vi.fn()
  const mockSetSelectedProject = vi.fn()
  const mockSetSelectedSprint = vi.fn()

  const defaultProps = {
    selectedInstance: '',
    setSelectedInstance: mockSetSelectedInstance,
    selectedProject: '',
    setSelectedProject: mockSetSelectedProject,
    selectedSprint: '',
    setSelectedSprint: mockSetSelectedSprint,
    jiraConnectionStatus: 'checking' as const,
    jiraConnectionMessage: 'Checking JIRA connection...',
    githubConnectionStatus: 'checking' as const,
    githubConnectionMessage: 'Checking GitHub connection...',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(api.fetchInstances).mockResolvedValue(mockInstances)
    vi.mocked(api.fetchProjects).mockResolvedValue(mockProjects)
    vi.mocked(api.fetchSprints).mockResolvedValue(mockSprints)
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should render all control elements', () => {
    render(<Controls {...defaultProps} />)

    expect(screen.getByLabelText('JIRA Instance:')).toBeInTheDocument()
    expect(screen.getByLabelText('Project:')).toBeInTheDocument()
    expect(screen.getByLabelText('Sprint:')).toBeInTheDocument()
  })

  it('should load instances on mount', async () => {
    render(<Controls {...defaultProps} />)

    await waitFor(() => {
      expect(api.fetchInstances).toHaveBeenCalled()
    })
  })

  it('should auto-select primary instance', async () => {
    render(<Controls {...defaultProps} />)

    await waitFor(() => {
      expect(mockSetSelectedInstance).toHaveBeenCalledWith('primary')
    })
  })

  it('should auto-select first instance if no primary', async () => {
    vi.mocked(api.fetchInstances).mockResolvedValue({
      instances: [
        { id: 'instance1', name: 'Instance 1' },
        { id: 'instance2', name: 'Instance 2' },
      ],
    })

    render(<Controls {...defaultProps} />)

    await waitFor(() => {
      expect(mockSetSelectedInstance).toHaveBeenCalledWith('instance1')
    })
  })

  it('should display instances in dropdown', async () => {
    render(<Controls {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Primary Instance')).toBeInTheDocument()
      expect(screen.getByText('Secondary Instance')).toBeInTheDocument()
    })
  })

  it('should load projects when instance is selected', async () => {
    render(<Controls {...defaultProps} selectedInstance="primary" />)

    await waitFor(() => {
      expect(api.fetchProjects).toHaveBeenCalledWith('primary')
    })
  })

  it('should not load projects when no instance is selected', () => {
    render(<Controls {...defaultProps} selectedInstance="" />)

    expect(api.fetchProjects).not.toHaveBeenCalled()
  })

  it('should display projects in dropdown', async () => {
    render(<Controls {...defaultProps} selectedInstance="primary" />)

    await waitFor(() => {
      expect(screen.getByText(/PROJ1 - Project 1/)).toBeInTheDocument()
      expect(screen.getByText(/PROJ2 - Project 2/)).toBeInTheDocument()
    })
  })

  it('should auto-select default project (CLX LS-CLX Platform)', async () => {
    render(<Controls {...defaultProps} selectedInstance="primary" />)

    await waitFor(() => {
      expect(mockSetSelectedProject).toHaveBeenCalledWith('PROJ3')
    })
  })

  it('should restore project from localStorage', async () => {
    localStorage.setItem('jira_dashboard_project', 'PROJ1')

    render(<Controls {...defaultProps} selectedInstance="primary" />)

    await waitFor(() => {
      expect(mockSetSelectedProject).toHaveBeenCalledWith('PROJ1')
    })
  })

  it('should load sprints when project is selected', async () => {
    render(<Controls {...defaultProps} selectedInstance="primary" selectedProject="PROJ1" />)

    await waitFor(() => {
      expect(api.fetchSprints).toHaveBeenCalledWith('primary', 'PROJ1')
    })
  })

  it('should not load sprints when no project is selected', () => {
    render(<Controls {...defaultProps} selectedInstance="primary" selectedProject="" />)

    expect(api.fetchSprints).not.toHaveBeenCalled()
  })

  it('should sort sprints with active first', async () => {
    render(<Controls {...defaultProps} selectedInstance="primary" selectedProject="PROJ1" />)

    await waitFor(() => {
      expect(mockSetSelectedSprint).toHaveBeenCalled()
    })

    // The active sprint (101) should be selected
    await waitFor(() => {
      expect(mockSetSelectedSprint).toHaveBeenCalledWith('101')
    })
  })

  it('should display sprint icons correctly', async () => {
    render(<Controls {...defaultProps} selectedInstance="primary" selectedProject="PROJ1" />)

    await waitFor(() => {
      expect(screen.getByText(/🟢 Sprint 101/)).toBeInTheDocument() // active
      expect(screen.getByText(/🔵 Sprint 102/)).toBeInTheDocument() // future
      expect(screen.getByText(/⚫ Sprint 100/)).toBeInTheDocument() // closed
    })
  })

  it('should include "All Sprints" option', async () => {
    render(<Controls {...defaultProps} selectedInstance="primary" selectedProject="PROJ1" />)

    await waitFor(() => {
      expect(screen.getByText('All Sprints')).toBeInTheDocument()
    })
  })

  it('should restore sprint from localStorage', async () => {
    localStorage.setItem('jira_dashboard_sprint', '100')

    render(<Controls {...defaultProps} selectedInstance="primary" selectedProject="PROJ1" />)

    await waitFor(() => {
      expect(mockSetSelectedSprint).toHaveBeenCalledWith('100')
    })
  })

  it('should restore "all" sprint from localStorage', async () => {
    localStorage.setItem('jira_dashboard_sprint', 'all')

    render(<Controls {...defaultProps} selectedInstance="primary" selectedProject="PROJ1" />)

    await waitFor(() => {
      expect(mockSetSelectedSprint).toHaveBeenCalledWith('all')
    })
  })

  it('should change instance when dropdown value changes', async () => {
    render(<Controls {...defaultProps} selectedInstance="primary" />)

    await waitFor(() => {
      expect(screen.getByText('Primary Instance')).toBeInTheDocument()
    })

    const select = screen.getByLabelText('JIRA Instance:')
    fireEvent.change(select, { target: { value: 'secondary' } })

    expect(mockSetSelectedInstance).toHaveBeenCalledWith('secondary')
  })

  it('should change project when dropdown value changes', async () => {
    render(<Controls {...defaultProps} selectedInstance="primary" />)

    await waitFor(() => {
      expect(screen.getByText(/PROJ1 - Project 1/)).toBeInTheDocument()
    })

    const select = screen.getByLabelText('Project:')
    fireEvent.change(select, { target: { value: 'PROJ2' } })

    expect(mockSetSelectedProject).toHaveBeenCalledWith('PROJ2')
  })

  it('should change sprint when dropdown value changes', async () => {
    render(<Controls {...defaultProps} selectedInstance="primary" selectedProject="PROJ1" />)

    await waitFor(() => {
      expect(screen.getByText(/Sprint 101/)).toBeInTheDocument()
    })

    const select = screen.getByLabelText('Sprint:')
    fireEvent.change(select, { target: { value: 'all' } })

    expect(mockSetSelectedSprint).toHaveBeenCalledWith('all')
  })

  it('should disable project dropdown when no instance is selected', () => {
    render(<Controls {...defaultProps} selectedInstance="" />)

    const select = screen.getByLabelText('Project:')
    expect(select).toBeDisabled()
  })

  it('should disable sprint dropdown when no project is selected', () => {
    render(<Controls {...defaultProps} selectedInstance="primary" selectedProject="" />)

    const select = screen.getByLabelText('Sprint:')
    expect(select).toBeDisabled()
  })

  it('should save instance to localStorage when changed', async () => {
    render(<Controls {...defaultProps} selectedInstance="primary" />)

    await waitFor(() => {
      expect(localStorage.getItem('jira_dashboard_instance')).toBe('primary')
    })
  })

  it('should save project to localStorage when changed', async () => {
    render(<Controls {...defaultProps} selectedProject="PROJ1" />)

    await waitFor(() => {
      expect(localStorage.getItem('jira_dashboard_project')).toBe('PROJ1')
    })
  })

  it('should save sprint to localStorage when changed', async () => {
    render(<Controls {...defaultProps} selectedSprint="101" />)

    await waitFor(() => {
      expect(localStorage.getItem('jira_dashboard_sprint')).toBe('101')
    })
  })

  it('should show loading state for projects', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(() => resolve(mockProjects), 100))
    vi.mocked(api.fetchProjects).mockReturnValue(slowPromise as any)

    render(<Controls {...defaultProps} selectedInstance="primary" />)

    expect(screen.getByText('Loading projects...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument()
    })
  })

  it('should show loading state for sprints', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(() => resolve(mockSprints), 100))
    vi.mocked(api.fetchSprints).mockReturnValue(slowPromise as any)

    render(<Controls {...defaultProps} selectedInstance="primary" selectedProject="PROJ1" />)

    expect(screen.getByText('Loading sprints...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('Loading sprints...')).not.toBeInTheDocument()
    })
  })

  it('should handle error loading instances', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(api.fetchInstances).mockRejectedValue(new Error('API Error'))

    render(<Controls {...defaultProps} />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading instances:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('should handle error loading projects', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(api.fetchProjects).mockRejectedValue(new Error('API Error'))

    render(<Controls {...defaultProps} selectedInstance="primary" />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading projects:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('should handle error loading sprints', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(api.fetchSprints).mockRejectedValue(new Error('API Error'))

    render(<Controls {...defaultProps} selectedInstance="primary" selectedProject="PROJ1" />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading sprints:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('should show proper message when no instances are loaded', () => {
    vi.mocked(api.fetchInstances).mockResolvedValue({ instances: [] })

    render(<Controls {...defaultProps} />)

    expect(screen.getByText('Loading instances...')).toBeInTheDocument()
  })

  it('should show proper message when no projects are loaded', () => {
    render(<Controls {...defaultProps} selectedInstance="" />)

    expect(screen.getByText('Select an instance first...')).toBeInTheDocument()
  })

  it('should show proper message when no sprints are loaded', () => {
    render(<Controls {...defaultProps} selectedInstance="primary" selectedProject="" />)

    expect(screen.getByText('Select a project first...')).toBeInTheDocument()
  })
})
