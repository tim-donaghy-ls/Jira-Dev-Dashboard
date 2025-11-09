'use client'

import { signOut, useSession } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'

export default function UserMenu() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Don't render if no session - user will be redirected to signin
  if (!session?.user) {
    return null
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-transparent border border-custom rounded-lg cursor-pointer transition-all text-sm text-primary hover:bg-black/5 dark:hover:bg-white/5 hover:border-primary"
        title="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials(session.user.name)
          )}
        </div>
        <span className="font-medium">{session.user.name || session.user.email}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-container border border-custom rounded-lg shadow-card min-w-[220px] z-[1000] overflow-hidden">
          <div className="p-3 border-b border-custom">
            <div className="font-semibold text-sm mb-1 text-primary">
              {session.user.name}
            </div>
            <div className="text-xs text-secondary">
              {session.user.email}
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="w-full p-3 bg-transparent border-none text-left cursor-pointer text-sm text-primary transition-colors hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
