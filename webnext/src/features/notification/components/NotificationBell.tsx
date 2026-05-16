'use client'

import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/features/notification/hooks/useNotifications'
import { formatTime } from '@/shared/lib/utils'
import { useNotificationContext } from '@/features/notification/context/NotificationContext'

export default function NotificationBell() {
  // const { notifications, totalUnread } = useNotificationContext()
  const { notifications, totalUnread, unreadCounts, onlineUsers, wsStatus, markConversationRead } 
  = useNotificationContext()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
             className="w-6 h-6 text-gray-600 dark:text-gray-300">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a1 1 0 10-2 0v.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {totalUnread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500
                           text-white text-[9px] font-bold flex items-center justify-center">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 rounded-2xl shadow-xl border
                        border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
                        overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              Notifications
            </h3>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800
                                            transition-colors ${!n.is_read ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''}`}>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
