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
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
            <span className="text-[#6795C9] dark:text-[#e8e8e8] group-hover:text-white font-semibold text-sm transition-colors">Assistant</span>
          </button>
        )}
      </div>
    </header>
  )
}
