'use client'

import { ThemeToggle } from './ThemeToggle'
import UserMenu from './UserMenu'
import Image from 'next/image'

interface HeaderProps {
  onOpenChat?: () => void
}

export function Header({ onOpenChat }: HeaderProps) {

  return (
    <header className="mb-8">
      {/* Top Bar: Auth and Theme */}
      <div className="flex justify-end items-center gap-5 pb-3 mb-5 border-b border-custom">
        <ThemeToggle />
        <UserMenu />
      </div>

      {/* Main Header: Logo and Title */}
      <div className="flex items-center gap-5 pb-5 border-b border-custom">
        <Image
          src="/legalsifter-logo.png"
          alt="Legal Sifter"
          width={150}
          height={26}
          className="h-10 w-auto dark:hidden"
          priority
          unoptimized
        />
        <Image
          src="/legalsifter-logo-wh-dark.png"
          alt="Legal Sifter"
          width={150}
          height={26}
          className="h-10 w-auto hidden dark:block"
          priority
          unoptimized
        />
        <h1 className="text-[28px] font-bold text-primary tracking-tight">
          Development Metrics Dashboard
        </h1>

        {/* Dashboard Assistant Button */}
        {onOpenChat && (
          <button
            onClick={onOpenChat}
            className="ml-auto px-4 py-2.5 rounded-lg bg-white dark:bg-[#2c3038] border border-custom hover:bg-[#6795C9] hover:dark:bg-[#4d9fff] hover:border-[#6795C9] hover:dark:border-[#4d9fff] transition-all duration-200 shadow-card hover:shadow-card-hover flex items-center gap-2 group relative"
            aria-label="Dashboard Assistant (⌘K)"
            title="Dashboard Assistant (⌘K)"
          >
            <svg
              className="w-6 h-6 text-[#6795C9] dark:text-[#e8e8e8] group-hover:text-white transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-[#6795C9] dark:text-[#e8e8e8] group-hover:text-white font-semibold text-sm transition-colors">Assistant</span>
          </button>
        )}
      </div>
    </header>
  )
}
