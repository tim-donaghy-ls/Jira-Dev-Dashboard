'use client'

import { ThemeToggle } from './ThemeToggle'
import UserMenu from './UserMenu'
import Image from 'next/image'

export function Header() {
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
      </div>
    </header>
  )
}
