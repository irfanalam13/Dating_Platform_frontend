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
        className="relative grid h-10 w-10 place-items-center rounded-full border border-[#EADDD2] text-[#2D2424]"
      >
        <Bell className="h-5 w-5" />

        {/* Red dot badge */}
        {totalUnread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#7A2432] text-[9px] font-bold text-white">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-[#EADDD2] shadow-xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#EADDD2] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#2D2424]">
              Notifications
            </h3>
            {totalUnread > 0 && (
              <span className="rounded-full bg-[#7A2432] px-2 py-0.5 text-[10px] font-bold text-white">
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
                  className={`px-4 py-3 ${ !n.is_read ? "bg-[#FEF6F0]" : "bg-white" }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Unread dot */}
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#B78A3B]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!n.is_read ? "font-semibold" : "font-medium"} text-[#2D2424]`}>
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
            className="flex w-full items-center justify-center border-t border-[#EADDD2] py-3 text-sm font-medium text-[#7A2432] hover:bg-[#FFF8F1] transition-colors"
          >
            See all notifications
          </button>
        </div>
      )}
    </div>
  );
}