"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  HeartHandshake,
  Home,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { useNotificationContext } from "@/features/notification/context/NotificationContext";

// ─────────────────────────────────────────────────────────
// Nav config
// ─────────────────────────────────────────────────────────

const nav = [
  { href: "/home",         label: "Home",    icon: Home, color: "#000000" },
  { href: "/matches",      label: "Matches", icon: HeartHandshake, color: "#FF0000" },
  { href: "/chat",         label: "Chat",    icon: MessageCircle, color: "#00D400" },
  { href: "/notification", label: "Alerts",  icon: Bell, color: "#000000" },
  { href: "/profile",      label: "Profile", icon: UserRound, color: "#000000" },
  // { href: "/settings", label: "Settings", icon: Settings },

];

// ─────────────────────────────────────────────────────────
// Bell with live red dot
// ─────────────────────────────────────────────────────────

function BellWithBadge({ color }: { color?: string }) {
  const { totalUnread } = useNotificationContext();

  return (
    <div className="relative">
      <Bell className="h-5 w-5" color={color} />
      {totalUnread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#7A2432] text-[9px] font-bold text-white">
          {totalUnread > 9 ? "9+" : totalUnread}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Chat with live amber dot
// ─────────────────────────────────────────────────────────

function ChatWithBadge({ color }: { color?: string }) {
  const { unreadCounts } = useNotificationContext();

  const total = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="relative">
      <MessageCircle className="h-5 w-5" color={color} />
      {total > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#B78A3B] text-[9px] font-bold text-white">
          {total > 9 ? "9+" : total}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Shell — NO NotificationProvider here
// It already wraps everything in providers.tsx
// ─────────────────────────────────────────────────────────

export function MvpShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideNav =
    pathname.startsWith("/chat/") ||
    pathname === "/profile/edit";

  return (
    <>                                         {/*   fragment fixes the two-sibling error */}
      <main className={!hideNav ? "pb-16" : ""}>
        {children}
      </main>

      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-4 z-40 flex justify-center pointer-events-auto">
          <div className="bottom-nav-glass mx-auto max-w-md w-full px-3">
            <div className="flex items-center justify-between">
              {nav.map(({ href, label, icon: Icon, color }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex flex-col items-center gap-1 px-2 transition-colors`}
                    aria-label={label}
                  >
                    <div className={`bottom-nav-item ${active ? "activated" : ""}`}>
                      {href === "/notification" ? (
                        <BellWithBadge color={color} />
                      ) : href === "/chat" ? (
                        <ChatWithBadge color={color} />
                      ) : (
                        <Icon className="h-5 w-5" color={color} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </>
  );
}