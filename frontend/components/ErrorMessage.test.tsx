import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorMessage } from './ErrorMessage'

describe('ErrorMessage', () => {
  it('should render error message', () => {
    render(<ErrorMessage message="Test error message" />)

    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('should apply correct styling', () => {
    const { container } = render(<ErrorMessage message="Error" />)

    const errorDiv = container.firstChild as HTMLElement
    expect(errorDiv).toHaveClass('bg-red-50')
    expect(errorDiv).toHaveClass('dark:bg-red-900/20')
    expect(errorDiv).toHaveClass('text-red-800')
    expect(errorDiv).toHaveClass('dark:text-red-200')
    expect(errorDiv).toHaveClass('border-red-200')
    expect(errorDiv).toHaveClass('dark:border-red-800')
  })

  it('should handle empty message', () => {
    const { container } = render(<ErrorMessage message="" />)

    const errorDiv = container.querySelector('.bg-red-50')
    expect(errorDiv).toBeInTheDocument()
    expect(errorDiv).toHaveTextContent('')
  })

  it('should handle long messages', () => {
    const longMessage = 'This is a very long error message that should still be displayed correctly in the error component without any truncation or issues'
    render(<ErrorMessage message={longMessage} />)

    expect(screen.getByText(longMessage)).toBeInTheDocument()
  })
})
