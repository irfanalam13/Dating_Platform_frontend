// 'use client'

// import { useState, useRef, useEffect } from 'react'
// import { useNotifications } from '@/features/notification/hooks/useNotifications'
// import { formatTime } from '@/shared/lib/utils'
// import { useNotificationContext } from '@/features/notification/context/NotificationContext'

// export default function NotificationBell() {
//   // const { notifications, totalUnread } = useNotificationContext()
//   const { notifications, totalUnread, unreadCounts, onlineUsers, wsStatus, markConversationRead } 
//   = useNotificationContext()
//   const [open, setOpen] = useState(false)
//   const ref = useRef<HTMLDivElement>(null)

//   useEffect(() => {
//     function handleClick(e: MouseEvent) {
//       if (ref.current && !ref.current.contains(e.target as Node)) {
//         setOpen(false)
//       }
//     }
//     document.addEventListener('mousedown', handleClick)
//     return () => document.removeEventListener('mousedown', handleClick)
//   }, [])

//   return (
//     <div ref={ref} className="relative">
//       <button
//         onClick={() => setOpen((v) => !v)}
//         className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
//         aria-label="Notifications"
//       >
//         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
//              className="w-6 h-6 text-gray-600 dark:text-gray-300">
//           <path strokeLinecap="round" strokeLinejoin="round"
//             d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a1 1 0 10-2 0v.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
//         </svg>
//         {totalUnread > 0 && (
//           <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500
//                            text-white text-[9px] font-bold flex items-center justify-center">
//             {totalUnread > 99 ? '99+' : totalUnread}
//           </span>
//         )}
//       </button>

//       {open && (
//         <div className="absolute right-0 top-12 w-80 rounded-2xl shadow-xl border
//                         border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
//                         overflow-hidden z-50">
//           <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
//             <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
//               Notifications
//             </h3>
//           </div>

//           <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
//             {notifications.length === 0 ? (
//               <div className="px-4 py-8 text-center text-sm text-gray-400">
//                 No notifications yet
//               </div>
//             ) : (
//               notifications.map((n) => (
//                 <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800
//                                             transition-colors ${!n.is_read ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''}`}>
//                   <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
//                   <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.body}</p>
//                   <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.created_at)}</p>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

























"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useNotificationContext } from "@/features/notification/context/NotificationContext";
import { formatTime } from "@/shared/utils/time";

export default function NotificationBell() {
  const router                          = useRouter();
  const { notifications, totalUnread } = useNotificationContext();
  const [open, setOpen]                 = useState(false);
  const ref                             = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-full
                   border border-[#EADDD2] bg-white text-[#2D2424]"
      >
        <Bell className="h-5 w-5" />

        {/* Red dot badge */}
        {totalUnread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center
                           justify-center rounded-full bg-[#7A2432] text-[9px]
                           font-bold text-white">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden
                        rounded-2xl border border-[#EADDD2] bg-white shadow-xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b
                          border-[#EADDD2] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#2D2424]">
              Notifications
            </h3>
            {totalUnread > 0 && (
              <span className="rounded-full bg-[#7A2432] px-2 py-0.5
                               text-[10px] font-bold text-white">
                {totalUnread} new
              </span>
            )}
          </div>

          {/* List — max 5 items, see all link */}
          <div className="max-h-80 divide-y divide-[#F0E8E0] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#746767]">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 ${
                    !n.is_read ? "bg-[#FEF6F0]" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Unread dot */}
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full
                                       bg-[#B78A3B]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!n.is_read ? "font-semibold" : "font-medium"} 
                                     text-[#2D2424]`}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#746767]">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[10px] text-[#A89090]">
                        {formatTime(n.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer — see all */}
          <button
            onClick={() => {
              setOpen(false);
              router.push("/notification");
            }}
            className="flex w-full items-center justify-center border-t
                       border-[#EADDD2] py-3 text-sm font-medium text-[#7A2432]
                       hover:bg-[#FFF8F1] transition-colors"
          >
            See all notifications
          </button>
        </div>
      )}
    </div>
  );
}