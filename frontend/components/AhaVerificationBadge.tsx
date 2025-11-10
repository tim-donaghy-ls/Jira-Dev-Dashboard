'use client'

import { AhaVerification } from '@/types'

interface AhaVerificationBadgeProps {
  jiraKey: string
  verification?: AhaVerification
}

export default function AhaVerificationBadge({ jiraKey, verification }: AhaVerificationBadgeProps) {
  // Don't render anything if no verification data
  if (!verification) {
    return null
  }

  return (
    <>
      {verification.existsInAha ? (
        <a
          href={verification.ahaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
          title={`Aha Feature: ${verification.ahaReference} - ${verification.ahaStatus}`}
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Aha: {verification.ahaReference}</span>
        </a>
      ) : (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900"
          title="This ticket does not exist in Aha"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Not in Aha</span>
        </span>
      )}
    </>
  )
}
