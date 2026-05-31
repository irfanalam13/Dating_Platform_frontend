"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  HeartHandshake,
  Home,
  MessageCircle,
  UserRound,
  Heart,
} from "lucide-react";
import { useNotificationContext } from "@/features/notification/context/NotificationContext";

// ─────────────────────────────────────────────────────────
// Nav config
// ─────────────────────────────────────────────────────────

const nav = [
  { href: "/home",         label: "Home",    icon: Home,            activeColor: "#1a1a2e", inactiveColor: "#9ca3af" },
  { href: "/matches",      label: "Matches", icon: HeartHandshake,  activeColor: "#FF4458", inactiveColor: "#9ca3af" },
  { href: "/chat",         label: "Chat",    icon: MessageCircle,   activeColor: "#00D46A", inactiveColor: "#9ca3af" },
  { href: "/notification", label: "Alerts",  icon: Bell,            activeColor: "#FFB800", inactiveColor: "#9ca3af" },
  { href: "/profile",      label: "Profile", icon: UserRound,       activeColor: "#4cc9f0", inactiveColor: "#9ca3af" },
];

// ─────────────────────────────────────────────────────────
// Bell with live red dot
// ─────────────────────────────────────────────────────────

function BellWithBadge({ color }: { color: string }) {
  const { totalUnread } = useNotificationContext();

  return (
    <div className="relative">
      <Bell className="h-6 w-6" style={{ color }} />
      {totalUnread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4
                         items-center justify-center rounded-full
                         bg-[#FF4458] text-[9px] font-bold text-white">
          {totalUnread > 9 ? "9+" : totalUnread}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Chat with live badge
// ─────────────────────────────────────────────────────────

function ChatWithBadge({ color }: { color: string }) {
  const { unreadCounts } = useNotificationContext();

  const total = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="relative">
      <MessageCircle className="h-6 w-6" style={{ color }} />
      {total > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4
                         items-center justify-center rounded-full
                         bg-[#FF4458] text-[9px] font-bold text-white">
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
      <main className={!hideNav ? "pb-[72px]" : ""}>
        {children}
      </main>

      {!hideNav && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 px-2 py-2"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.05)",
          }}
        >
          <div className="mx-auto grid max-w-md grid-cols-5">
            {nav.map(({ href, label, icon: Icon, activeColor, inactiveColor }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              const color = active ? activeColor : inactiveColor;

              return (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-0.5 rounded-xl py-2 transition-all"
                >
                  {href === "/notification" ? (
                    <BellWithBadge color={color} />
                  ) : href === "/chat" ? (
                    <ChatWithBadge color={color} />
                  ) : (
                    <Icon className="h-6 w-6" style={{ color }} />
                  )}
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color }}
                  >
                    {label}
                  </span>
                  {/* Active indicator dot */}
                  {active && (
                    <span
                      className="h-1 w-1 rounded-full mt-0.5"
                      style={{ backgroundColor: activeColor }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}