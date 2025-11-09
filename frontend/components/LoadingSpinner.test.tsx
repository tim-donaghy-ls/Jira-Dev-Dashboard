import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from './LoadingSpinner'

describe('LoadingSpinner', () => {
  it('should render loading message', () => {
    render(<LoadingSpinner />)

    expect(screen.getByText('Loading JIRA data...')).toBeInTheDocument()
  })

  it('should render spinner element', () => {
    const { container } = render(<LoadingSpinner />)

    const spinner = container.querySelector('.animate-spin-custom')
    expect(spinner).toBeInTheDocument()
  })

  it('should apply correct container styling', () => {
    const { container } = render(<LoadingSpinner />)

    const containerDiv = container.firstChild as HTMLElement
    expect(containerDiv).toHaveClass('text-center')
    expect(containerDiv).toHaveClass('py-10')
    expect(containerDiv).toHaveClass('bg-container')
    expect(containerDiv).toHaveClass('shadow-card')
  })

  it('should apply correct spinner styling', () => {
    const { container } = render(<LoadingSpinner />)

    const spinner = container.querySelector('.animate-spin-custom') as HTMLElement
    expect(spinner).toHaveClass('w-[50px]')
    expect(spinner).toHaveClass('h-[50px]')
    expect(spinner).toHaveClass('border-4')
    expect(spinner).toHaveClass('rounded-full')
  })
})
