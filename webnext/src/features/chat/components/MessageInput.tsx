'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { X, Paperclip } from 'lucide-react'
import { debounceTyping } from '@/shared/lib/utils'
import type { Message } from '@/shared/types/chat.types'

interface Props {
  onSend: (text: string) => void
  onTyping: (isTyping: boolean) => void
  disabled?: boolean
  replyTo?: Message | null
  onCancelReply?: () => void
  editing?: Message | null
  onSubmitEdit?: (text: string) => void
  onCancelEdit?: () => void
  onAttachImage?: (file: File) => void
}

export default function MessageInput({
  onSend, onTyping, disabled, replyTo, onCancelReply,
  editing, onSubmitEdit, onCancelEdit, onAttachImage,
}: Props) {
  const [text, setText] = useState('')
  const isTypingRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Prefill when entering edit mode (or switching which message is edited).
  // Adjusting state during render — keyed on the message id — avoids the extra
  // render an effect would cause and only fires when the edited message changes.
  const [prevEditingId, setPrevEditingId] = useState<Message['id'] | null>(editing?.id ?? null)
  if ((editing?.id ?? null) !== prevEditingId) {
    setPrevEditingId(editing?.id ?? null)
    if (editing) setText(editing.content)
  }

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    if (!editing) {
      if (!isTypingRef.current) {
        isTypingRef.current = true
        onTyping(true)
      }
      debounceTyping(() => {
        isTypingRef.current = false
        onTyping(false)
      }, 1500)
    }
  }, [onTyping, editing])

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    if (editing) {
      onSubmitEdit?.(trimmed)
    } else {
      onSend(trimmed)
    }
    setText('')
    isTypingRef.current = false
    onTyping(false)
  }, [text, disabled, editing, onSend, onSubmitEdit, onTyping])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      if (editing) onCancelEdit?.()
      else if (replyTo) onCancelReply?.()
    }
  }, [handleSend, editing, replyTo, onCancelEdit, onCancelReply])

  return (
    <div className="border-t border-white/40 backdrop-blur-md">
      {/* Reply banner */}
      {replyTo && !editing && (
        <div className="flex items-center gap-2 px-4 pt-2">
          <div className="flex-1 rounded-lg border-l-2 border-indigo-400 bg-white/50 px-2 py-1 text-xs text-[#2D2424]">
            <span className="font-semibold">Replying</span>
            <span className="ml-2 line-clamp-1 inline opacity-70">{replyTo.content || 'Attachment'}</span>
          </div>
          <button onClick={onCancelReply} className="glass-btn grid h-7 w-7 place-items-center rounded-full" aria-label="Cancel reply">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Edit banner */}
      {editing && (
        <div className="flex items-center gap-2 px-4 pt-2">
          <div className="flex-1 rounded-lg border-l-2 border-amber-400 bg-amber-50/60 px-2 py-1 text-xs text-[#2D2424]">
            <span className="font-semibold">Editing message</span>
          </div>
          <button onClick={() => { onCancelEdit?.(); setText('') }} className="glass-btn grid h-7 w-7 place-items-center rounded-full" aria-label="Cancel edit">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        {!editing && onAttachImage && (
          <>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onAttachImage(f)
                if (fileRef.current) fileRef.current.value = ''
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={disabled}
              className="glass-btn grid h-10 w-10 shrink-0 place-items-center rounded-full disabled:opacity-40"
              aria-label="Attach image"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </>
        )}
        <textarea
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={editing ? 'Edit message…' : 'Message…'}
          disabled={disabled}
          className="flex-1 resize-none rounded-2xl border border-white/50
                     bg-white/30 backdrop-blur-sm px-4 py-2.5 text-sm text-[#2D2424]
                     placeholder:text-[#746767] focus:outline-none focus:ring-2 focus:ring-white/50
                     disabled:opacity-50 max-h-32 overflow-y-auto"
          style={{ lineHeight: '1.5' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700
                     disabled:opacity-40 disabled:cursor-not-allowed text-white
                     flex items-center justify-center transition-colors"
          aria-label={editing ? 'Save edit' : 'Send message'}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 rotate-90">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
