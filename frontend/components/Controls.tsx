'use client'

import { useState, useEffect } from 'react'
import { JiraInstance, JiraProject, JiraSprint } from '@/types'
import { fetchInstances, fetchProjects, fetchSprints } from '@/lib/api'

interface ControlsProps {
  selectedInstance: string
  setSelectedInstance: (value: string) => void
  selectedProject: string
  setSelectedProject: (value: string) => void
  selectedSprint: string
  setSelectedSprint: (value: string) => void
}

export function Controls({
  selectedInstance,
  setSelectedInstance,
  selectedProject,
  setSelectedProject,
  selectedSprint,
  setSelectedSprint,
}: ControlsProps) {
  const [instances, setInstances] = useState<JiraInstance[]>([])
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [sprints, setSprints] = useState<JiraSprint[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loadingSprints, setLoadingSprints] = useState(false)

  // Load instances on mount
  useEffect(() => {
    async function loadInstances() {
      try {
        const data = await fetchInstances()
        setInstances(data.instances)

        // Auto-select primary or first instance
        if (data.instances.length > 0) {
          const primary = data.instances.find(i => i.id === 'primary')
          const selected = primary?.id || data.instances[0].id
          setSelectedInstance(selected)
        }
      } catch (error) {
        console.error('Error loading instances:', error)
      }
    }
    loadInstances()
  }, [setSelectedInstance])

  // Load projects when instance changes
  useEffect(() => {
    if (!selectedInstance) return

    async function loadProjects() {
      setLoadingProjects(true)
      try {
        const data = await fetchProjects(selectedInstance)
        setProjects(data.projects)

        // Auto-select saved or default project
        const saved = localStorage.getItem('jira_dashboard_project')
        if (saved && data.projects.some(p => p.key === saved)) {
          setSelectedProject(saved)
        } else {
          const defaultProject = data.projects.find(p => p.name === 'CLX LS-CLX Platform')
          if (defaultProject) {
            setSelectedProject(defaultProject.key)
          }
        }
      } catch (error) {
        console.error('Error loading projects:', error)
      } finally {
        setLoadingProjects(false)
      }
    }
    loadProjects()
  }, [selectedInstance, setSelectedProject])

  // Load sprints when project changes
  useEffect(() => {
    if (!selectedInstance || !selectedProject) return

    async function loadSprints() {
      setLoadingSprints(true)
      try {
        const data = await fetchSprints(selectedInstance, selectedProject)

        // Sort sprints: active first, then by ID descending
        const sorted = data.sprints.sort((a, b) => {
          if (a.state === 'active' && b.state !== 'active') return -1
          if (b.state === 'active' && a.state !== 'active') return 1
          return b.id - a.id
        })

        setSprints(sorted)

        // Auto-select active sprint or saved
        const saved = localStorage.getItem('jira_dashboard_sprint')
        if (saved && (saved === 'all' || sorted.some(s => s.id.toString() === saved))) {
          setSelectedSprint(saved)
        } else {
          const active = sorted.find(s => s.state === 'active')
          setSelectedSprint(active ? active.id.toString() : sorted[0]?.id.toString() || 'all')
        }
      } catch (error) {
        console.error('Error loading sprints:', error)
      } finally {
        setLoadingSprints(false)
      }
    }
    loadSprints()
  }, [selectedInstance, selectedProject, setSelectedSprint])

  // Save selections to localStorage
  useEffect(() => {
    if (selectedInstance) localStorage.setItem('jira_dashboard_instance', selectedInstance)
  }, [selectedInstance])

  useEffect(() => {
    if (selectedProject) localStorage.setItem('jira_dashboard_project', selectedProject)
  }, [selectedProject])

  useEffect(() => {
    if (selectedSprint) localStorage.setItem('jira_dashboard_sprint', selectedSprint)
  }, [selectedSprint])

  const getSprintIcon = (state: string) => {
    if (state === 'active') return '🟢'
    if (state === 'future') return '🔵'
    return '⚫'
  }

  return (
    <div className="flex flex-wrap gap-4 items-end mb-8 p-5 bg-container shadow-card border border-custom rounded-lg">
      <div className="flex flex-col gap-1.5 min-w-[120px] flex-1 max-w-[240px]">
        <label htmlFor="instanceKey" className="text-sm font-semibold text-primary">
          JIRA Instance:
        </label>
        <select
          id="instanceKey"
          value={selectedInstance}
          onChange={(e) => setSelectedInstance(e.target.value)}
          className="px-3.5 py-2.5 border border-custom rounded-lg text-base bg-card text-primary transition-all duration-200 hover:border-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
        >
          {instances.length === 0 && <option value="">Loading instances...</option>}
          {instances.map((instance) => (
            <option key={instance.id} value={instance.id}>
              {instance.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[120px] flex-1 max-w-[240px]">
        <label htmlFor="projectKey" className="text-sm font-semibold text-primary">
          Project:
        </label>
        <select
          id="projectKey"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          disabled={!selectedInstance || loadingProjects}
          className="px-3.5 py-2.5 border border-custom rounded-lg text-base bg-card text-primary transition-all duration-200 hover:border-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingProjects && <option value="">Loading projects...</option>}
          {!loadingProjects && projects.length === 0 && <option value="">Select an instance first...</option>}
          {!loadingProjects && projects.length > 0 && <option value="">Select a project...</option>}
          {projects.map((project) => (
            <option key={project.key} value={project.key}>
              {project.key} - {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[120px] flex-1 max-w-[240px]">
        <label htmlFor="sprintKey" className="text-sm font-semibold text-primary">
          Sprint:
        </label>
        <select
          id="sprintKey"
          value={selectedSprint}
          onChange={(e) => setSelectedSprint(e.target.value)}
          disabled={!selectedProject || loadingSprints}
          className="px-3.5 py-2.5 border border-custom rounded-lg text-base bg-card text-primary transition-all duration-200 hover:border-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingSprints && <option value="">Loading sprints...</option>}
          {!loadingSprints && sprints.length === 0 && <option value="">Select a project first...</option>}
          {!loadingSprints && sprints.length > 0 && (
            <>
              <option value="all">All Sprints</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id.toString()}>
                  {getSprintIcon(sprint.state)} {sprint.name}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

    </div>
  )
}
