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
  { href: "/home",         label: "Home",    icon: Home },
  { href: "/matches",      label: "Matches", icon: HeartHandshake },
  { href: "/chat",         label: "Chat",    icon: MessageCircle },
  { href: "/notification", label: "Alerts",  icon: Bell },
  { href: "/profile",      label: "Profile", icon: UserRound },
  // { href: "/settings", label: "Settings", icon: Settings },

];

// ─────────────────────────────────────────────────────────
// Bell with live red dot
// ─────────────────────────────────────────────────────────

function BellWithBadge() {
  const { totalUnread } = useNotificationContext();

  return (
    <div className="relative">
      <Bell className="h-5 w-5" />
      {totalUnread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4
                         items-center justify-center rounded-full
                         bg-[#7A2432] text-[9px] font-bold text-white">
          {totalUnread > 9 ? "9+" : totalUnread}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Chat with live amber dot
// ─────────────────────────────────────────────────────────

function ChatWithBadge() {
  const { unreadCounts } = useNotificationContext();

  const total = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="relative">
      <MessageCircle className="h-5 w-5" />
      {total > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4
                         items-center justify-center rounded-full
                         bg-[#B78A3B] text-[9px] font-bold text-white">
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
    <>                                         {/* ✅ fragment fixes the two-sibling error */}
      <main className={!hideNav ? "pb-16" : ""}>
        {children}
      </main>

      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EADDD2]
                        bg-white/95 px-2 py-2 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-5">  {/* ✅ 5 cols not 6 */}
            {nav.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center gap-1 rounded-md py-2
                    text-[11px] font-medium transition-colors
                    ${active ? "text-[#7A2432]" : "text-[#746767]"}`}
                >
                  {href === "/notification" ? (
                    <BellWithBadge />
                  ) : href === "/chat" ? (
                    <ChatWithBadge />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}