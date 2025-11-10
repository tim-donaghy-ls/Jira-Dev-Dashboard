'use client'

import { useState, useRef, useEffect } from 'react'
import { DashboardData, ChatMessage } from '@/types'

interface ChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  dashboardData: DashboardData | null
  isLoading?: boolean
}

export function ChatDrawer({ isOpen, onClose, dashboardData, isLoading: parentLoading }: ChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [query, setQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Add welcome message when drawer opens for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Hi! I'm your Dashboard Assistant. I can help you:

• Analyze sprint metrics and team performance
• Generate Word docs, Excel sheets, or PowerPoint decks
• Export data and answer questions about your dashboard

What would you like to know?`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!query.trim()) return

    if (!dashboardData) {
      setError('Please select a project or sprint first to start chatting')
      return
    }

    // Clear any previous errors
    setError(null)

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setQuery('')
    setIsProcessing(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), dashboardData })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const { answer, error: apiError } = await response.json()

      if (apiError) {
        throw new Error(apiError)
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Failed to process your question'}. Please try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setError(null)
  }

  const isDisabled = isProcessing || parentLoading || !dashboardData

  // Handle document download
  const handleDownloadDocument = async (content: string, type: 'word' | 'excel' | 'powerpoint') => {
    const timestamp = new Date().toISOString().split('T')[0]

    try {
      if (type === 'word') {
        // Generate Word document
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')

        // Parse content into paragraphs
        const lines = content.split('\n')
        const paragraphs = lines.map(line => {
          const trimmed = line.trim()

          // Detect headings (lines that end with : or are all caps)
          if (trimmed.endsWith(':') && trimmed.length < 100) {
            return new Paragraph({
              text: trimmed,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 }
            })
          }

          // Detect bullet points
          if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
            return new Paragraph({
              text: trimmed.substring(1).trim(),
              bullet: { level: 0 },
              spacing: { before: 60, after: 60 }
            })
          }

          // Regular paragraph
          return new Paragraph({
            text: trimmed,
            spacing: { before: 120, after: 120 }
          })
        })

        const doc = new Document({
          sections: [{
            properties: {},
            children: paragraphs
          }]
        })

        const blob = await Packer.toBlob(doc)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Sprint_Report_${timestamp}.docx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

      } else if (type === 'excel') {
        // Generate Excel spreadsheet
        const XLSX = await import('xlsx')

        // Parse content into rows
        const lines = content.split('\n').filter(line => line.trim())
        const data: any[][] = []

        lines.forEach(line => {
          const trimmed = line.trim()
          // Split by common separators
          if (trimmed.includes('\t')) {
            data.push(trimmed.split('\t'))
          } else if (trimmed.includes(':')) {
            const parts = trimmed.split(':')
            data.push([parts[0].trim(), parts.slice(1).join(':').trim()])
          } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
            data.push([trimmed.substring(1).trim()])
          } else {
            data.push([trimmed])
          }
        })

        const ws = XLSX.utils.aoa_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Sprint Metrics')

        XLSX.writeFile(wb, `Sprint_Metrics_${timestamp}.xlsx`)

      } else if (type === 'powerpoint') {
        // Generate PowerPoint presentation
        const PptxGenJS = (await import('pptxgenjs')).default
        const pptx = new PptxGenJS()

        // Parse content into slides
        const sections = content.split('\n\n').filter(section => section.trim())

        sections.forEach((section, index) => {
          const slide = pptx.addSlide()
          const lines = section.split('\n').filter(line => line.trim())

          if (lines.length > 0) {
            const title = lines[0].trim()
            slide.addText(title, {
              x: 0.5,
              y: 0.5,
              w: 9,
              h: 1,
              fontSize: 24,
              bold: true,
              color: '363636'
            })

            // Add remaining lines as bullet points
            if (lines.length > 1) {
              const bullets = lines.slice(1).map(line => {
                const trimmed = line.trim()
                return {
                  text: trimmed.replace(/^[•\-]\s*/, ''),
                  options: { bullet: true }
                }
              })

              slide.addText(bullets, {
                x: 0.5,
                y: 2,
                w: 9,
                h: 4,
                fontSize: 14,
                color: '363636'
              })
            }
          }
        })

        await pptx.writeFile({ fileName: `Sprint_Presentation_${timestamp}.pptx` })
      }
    } catch (error) {
      console.error('Error generating document:', error)
      // Fallback to text file
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Sprint_Document_${timestamp}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  // Render message with document detection and copy functionality
  const renderMessage = (content: string) => {
    // Detect document markers
    const documentRegex = /\[(WORD_DOCUMENT|EXCEL_SPREADSHEET|POWERPOINT_PRESENTATION)\]([\s\S]*?)(?=\[(?:WORD_DOCUMENT|EXCEL_SPREADSHEET|POWERPOINT_PRESENTATION)\]|$)/g
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g

    const parts: Array<{ type: string; content: string; language?: string; docType?: string }> = []
    let lastIndex = 0

    // First, check for document markers
    let docMatch
    const docMatches: Array<{ index: number; length: number; type: string; content: string }> = []

    while ((docMatch = documentRegex.exec(content)) !== null) {
      docMatches.push({
        index: docMatch.index,
        length: docMatch[0].length,
        type: docMatch[1],
        content: docMatch[2].trim()
      })
    }

    // Reset regex
    documentRegex.lastIndex = 0

    // Process content with both code blocks and documents
    let currentIndex = 0
    const allMatches: Array<{ index: number; length: number; type: string; content: string; language?: string }> = []

    // Add document matches
    docMatches.forEach(dm => {
      allMatches.push({
        index: dm.index,
        length: dm.length,
        type: 'document',
        content: dm.content,
        language: dm.type
      })
    })

    // Add code block matches
    let codeMatch
    while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
      allMatches.push({
        index: codeMatch.index,
        length: codeMatch[0].length,
        type: 'code',
        content: codeMatch[2],
        language: codeMatch[1] || 'text'
      })
    }

    // Sort by index
    allMatches.sort((a, b) => a.index - b.index)

    // Build parts array
    allMatches.forEach(match => {
      if (match.index > currentIndex) {
        parts.push({
          type: 'text',
          content: content.substring(currentIndex, match.index)
        })
      }

      if (match.type === 'document') {
        parts.push({
          type: 'document',
          content: match.content,
          docType: match.language
        })
      } else {
        parts.push({
          type: 'code',
          content: match.content,
          language: match.language
        })
      }

      currentIndex = match.index + match.length
    })

    // Add remaining text
    if (currentIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(currentIndex)
      })
    }

    if (parts.length === 0) {
      return <div className="text-sm whitespace-pre-wrap leading-relaxed">{content}</div>
    }

    return (
      <div>
        {parts.map((part, index) => {
          if (part.type === 'text') {
            return <div key={index} className="text-sm whitespace-pre-wrap leading-relaxed mb-2">{part.content}</div>
          }

          if (part.type === 'document') {
            const docTypeMap: { [key: string]: { name: string; icon: string; color: string; downloadType: 'word' | 'excel' | 'powerpoint' } } = {
              'WORD_DOCUMENT': { name: 'Word Document', icon: '📄', color: 'bg-blue-600', downloadType: 'word' },
              'EXCEL_SPREADSHEET': { name: 'Excel Spreadsheet', icon: '📊', color: 'bg-green-600', downloadType: 'excel' },
              'POWERPOINT_PRESENTATION': { name: 'PowerPoint Presentation', icon: '📽️', color: 'bg-orange-600', downloadType: 'powerpoint' }
            }

            const docInfo = docTypeMap[part.docType || ''] || { name: 'Document', icon: '📄', color: 'bg-gray-600', downloadType: 'word' as const }

            return (
              <div key={index} className="my-4 border-2 border-blue-300 dark:border-blue-700 rounded-lg overflow-hidden">
                <div className={`${docInfo.color} text-white px-4 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{docInfo.icon}</span>
                    <span className="font-semibold">{docInfo.name}</span>
                  </div>
                  <button
                    onClick={() => handleDownloadDocument(part.content, docInfo.downloadType)}
                    className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 max-h-96 overflow-y-auto">
                  <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">{part.content}</pre>
                </div>
              </div>
            )
          }

          return (
            <div key={index} className="my-3">
              <div className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-t-lg">
                <span className="text-xs text-gray-300 font-mono">{part.language}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(part.content || '')
                  }}
                  className="text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
              <pre className="bg-gray-900 p-4 rounded-b-lg overflow-x-auto">
                <code className="text-xs text-gray-100 font-mono">{part.content}</code>
              </pre>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[50%] min-w-[600px] bg-container border-l border-custom shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-custom bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Dashboard Assistant</h2>
              <p className="text-xs text-secondary">Powered by Claude AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 1 && (
              <button
                onClick={handleClearChat}
                className="text-xs text-secondary hover:text-primary transition-colors px-2 py-1"
                title="Clear chat"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="text-secondary hover:text-primary transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="overflow-y-auto p-4" style={{ height: 'calc(100vh - 220px)' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-100 dark:bg-blue-900 text-primary'
                    : 'bg-gray-100 dark:bg-gray-800 text-primary'
                }`}
              >
                {renderMessage(message.content)}
                <p className="text-xs text-secondary mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 pb-2">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-custom bg-card">
          <div className="flex gap-2">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !dashboardData
                  ? 'Select a project or sprint to start...'
                  : 'Ask questions or request Word docs, Excel sheets, PowerPoint decks...'
              }
              className="flex-1 px-3.5 py-2.5 border border-custom rounded-lg bg-container text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              rows={3}
              disabled={isDisabled}
            />
            <button
              onClick={handleSend}
              disabled={isDisabled || !query.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium self-end"
            >
              {isProcessing ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-secondary mt-2">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    </>
  )
}
