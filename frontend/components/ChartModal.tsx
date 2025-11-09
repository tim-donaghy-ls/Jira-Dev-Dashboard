'use client'

import { ReactNode } from 'react'

interface ChartModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function ChartModal({ isOpen, onClose, title, children }: ChartModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-container border border-custom rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-container border-b border-custom px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded text-2xl font-bold text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Close"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          <div className="w-full h-[600px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
