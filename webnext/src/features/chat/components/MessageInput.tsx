'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { debounceTyping } from '@/shared/lib/utils'

interface Props {
  onSend: (text: string) => void
  onTyping: (isTyping: boolean) => void
  disabled?: boolean
}

export default function MessageInput({ onSend, onTyping, disabled }: Props) {
  const [text, setText] = useState('')
  const isTypingRef = useRef(false)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)

    if (!isTypingRef.current) {
      isTypingRef.current = true
      onTyping(true)
    }

    debounceTyping(() => {
      isTypingRef.current = false
      onTyping(false)
    }, 1500)
  }, [onTyping])

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    isTypingRef.current = false
    onTyping(false)
  }, [text, disabled, onSend, onTyping])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div className="flex items-end gap-2 p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <textarea
        rows={1}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Message…"
        disabled={disabled}
        className="flex-1 resize-none rounded-2xl border border-gray-200 dark:border-gray-700
                   bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100
                   placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                   disabled:opacity-50 max-h-32 overflow-y-auto"
        style={{ lineHeight: '1.5' }}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700
                   disabled:opacity-40 disabled:cursor-not-allowed text-white
                   flex items-center justify-center transition-colors"
        aria-label="Send message"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 rotate-90">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  )
}