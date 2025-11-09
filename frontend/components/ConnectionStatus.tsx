'use client'

interface ConnectionStatusProps {
  status: 'checking' | 'connected' | 'error'
  message: string
}

export function ConnectionStatus({ status, message }: ConnectionStatusProps) {
  const statusDotClass = status === 'connected'
    ? 'bg-green-500 shadow-[0_0_8px_rgba(76,175,80,0.5)]'
    : status === 'error'
    ? 'bg-red-500 shadow-[0_0_8px_rgba(244,67,54,0.5)]'
    : 'bg-gray-400'

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-container shadow-card border border-custom rounded-lg text-sm">
      <span
        className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${statusDotClass}`}
      />
      <span className="text-secondary font-medium">
        {message}
      </span>
    </div>
  )
}
