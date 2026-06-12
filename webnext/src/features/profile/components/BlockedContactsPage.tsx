"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { getBlockedUsers, unblockProfile } from "@/shared/api/mvp.api";
import { showError, showSuccess } from "@/shared/utils/toast";
import Avatar from "@/features/profile/components/Avatar";

export default function BlockedContactsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: blocked = [], isLoading } = useQuery({
    queryKey: ["blockedUsers"],
    queryFn: getBlockedUsers,
    retry: false,
  });

  const unblockMutation = useMutation({
    mutationFn: unblockProfile,
    onSuccess: () => {
      showSuccess("User unblocked.");
      // Refresh both cache keys in use: Settings (["blockedUsers"]) and the
      // chat window (["blocked-users"]), so the message bar reappears there too.
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
    },
    onError: (err) => showError(err, "Could not unblock user."),
  });

  return (
    <main className="min-h-[100dvh] px-4 py-5 text-[#2D2424]">
      <div className="mx-auto max-w-md">
        <header className="mb-5 rounded-full border border-white/55 bg-white/55 px-4 py-3 shadow-[0_8px_24px_rgba(16,24,40,0.10)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="glass-btn grid h-10 w-10 shrink-0 place-items-center rounded-full"
            >
              <span className="text-lg leading-none">←</span>
            </button>
            <div>
              <h1 className="text-2xl font-semibold">Blocked</h1>
              <p className="text-sm text-[#746767]">People you’ve blocked can’t message or find you.</p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-white/60 bg-white/40 p-2 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          {isLoading && (
            <div className="space-y-3 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/40" />
              ))}
            </div>
          )}

          {!isLoading && blocked.length === 0 && (
            <div className="grid min-h-[300px] place-items-center p-8 text-center">
              <div>
                <UserRound className="mx-auto mb-3 h-10 w-10 text-[#7A2432]" />
                <h2 className="font-semibold">No blocked users</h2>
                <p className="mt-2 text-sm leading-6 text-[#746767]">
                  When you block someone, they’ll show up here.
                </p>
              </div>
            </div>
          )}

          {!isLoading && blocked.length > 0 && (
            <ul className="divide-y divide-[#EADDD2]/70">
              {blocked.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-2 py-3">
                  <Avatar name={item.blocked_email} size="md" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.blocked_email}</span>
                  <button
                    type="button"
                    onClick={() => unblockMutation.mutate(item.blocked_profile_id)}
                    disabled={unblockMutation.isPending}
                    className="glass-btn shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-[#7A2432] disabled:opacity-50"
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
