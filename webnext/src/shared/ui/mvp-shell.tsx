"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Heart,
  Home,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { useNotificationContext } from "@/features/notification/context/NotificationContext";
import { useNotificationList } from "@/features/notification/hooks/useNotifications";
import { useReceivedMatches } from "@/features/matcher/hooks/useMatches";
import type { Notification } from "@/shared/types/notification.types";

// ─────────────────────────────────────────────────────────
// Nav config
// ─────────────────────────────────────────────────────────

const nav = [
  { href: "/home",         label: "Home",    icon: Home, color: "#000000", filled: false },
  { href: "/matches",      label: "Matches", icon: Heart, color: "#FF0000", filled: true },
  { href: "/chat",         label: "Chat",    icon: MessageCircle, color: "#00D400", filled: true },
  { href: "/notification", label: "Alerts",  icon: Bell, color: "#FFC400", filled: true },
  { href: "/profile",      label: "Profile", icon: UserRound, color: "#000000", filled: true },
  // { href: "/settings", label: "Settings", icon: Settings },

];

// ─────────────────────────────────────────────────────────
// House — solid black with a white (cut-out) door
// ─────────────────────────────────────────────────────────

function HouseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="#000000"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#000000" />
      <path d="M9 22V12h6v10" fill="#FFFFFF" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Bell with live red dot
// ─────────────────────────────────────────────────────────

function BellWithBadge({ color }: { color?: string }) {
  const { totalUnread } = useNotificationContext();

  return (
    <div className="relative">
      <Bell className="h-5 w-5" color={color} fill={color} />
      {totalUnread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F87171] text-[9px] font-bold text-white">
          {totalUnread > 9 ? "9+" : totalUnread}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Matches with incoming-request count
// ─────────────────────────────────────────────────────────

function MatchesWithBadge({ color }: { color?: string }) {
  const { data: received } = useReceivedMatches();
  const { data: notifications } = useNotificationList();

  // Two independent signals for "someone wants to match me", whichever the
  // backend populates:
  //  1) Pending incoming match requests from /matcher/received/.
  //  2) Unread match-type notifications from the live notification feed (the
  //     same WS-driven source that makes the Chat/Alerts badges pop).
  const pendingRequests = (received ?? []).filter((m) => m.status === "pending").length;
  const unreadMatchNotifs = (notifications ?? []).filter(
    (n: Notification) =>
      !n.is_read &&
      (n.notification_type === "friend_request" ||
        n.notification_type === "interest_claimed"),
  ).length;

  const count = Math.max(pendingRequests, unreadMatchNotifs);

  return (
    <div className="relative">
      <Heart className="h-5 w-5" color={color} fill={color} />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF0000] px-1 text-[9px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Chat with live amber dot
// ─────────────────────────────────────────────────────────

function ChatWithBadge({ color }: { color?: string }) {
  const { totalChatUnread } = useNotificationContext();

  return (
    <div className="relative">
      <MessageCircle className="h-5 w-5" color={color} fill={color} />
      {totalChatUnread > 0 && (
        <span
          className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B78A3B] px-1 text-[9px] font-bold text-white"
          aria-label={`${totalChatUnread} unread messages`}
        >
          {totalChatUnread > 9 ? "9+" : totalChatUnread}
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
              {nav.map(({ href, label, icon: Icon, color, filled }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex flex-col items-center gap-1 px-2 transition-colors`}
                    aria-label={label}
                  >
                    <div className={`bottom-nav-item ${active ? "activated" : ""}`}>
                      {href === "/home" ? (
                        <HouseIcon className="h-5 w-5" />
                      ) : href === "/notification" ? (
                        <BellWithBadge color={color} />
                      ) : href === "/chat" ? (
                        <ChatWithBadge color={color} />
                      ) : href === "/matches" ? (
                        <MatchesWithBadge color={color} />
                      ) : (
                        <Icon className="h-5 w-5" color={color} fill={filled ? color : "none"} />
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