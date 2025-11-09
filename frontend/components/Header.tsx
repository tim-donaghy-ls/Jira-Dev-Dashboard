'use client'

import { ThemeToggle } from './ThemeToggle'
import { ConnectionStatus } from './ConnectionStatus'
import Image from 'next/image'

interface HeaderProps {
  connectionStatus: 'checking' | 'connected' | 'error'
  connectionMessage: string
}

export function Header({ connectionStatus, connectionMessage }: HeaderProps) {
  return (
    <header className="flex justify-between items-center mb-8 pb-5 border-b border-custom">
      <div className="flex items-center gap-5">
        <Image
          src="/legalsifter-logo.png"
          alt="Legal Sifter"
          width={150}
          height={26}
          className="h-10 w-auto"
          priority
        />
        <h1 className="text-[28px] font-bold text-primary tracking-tight">
          Development Metrics Dashboard
        </h1>
      </div>
      <div className="flex items-center gap-5">
        <ThemeToggle />
        <ConnectionStatus status={connectionStatus} message={connectionMessage} />
      </div>
    </header>
  )
}
