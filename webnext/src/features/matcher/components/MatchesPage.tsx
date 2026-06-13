"use client";

import { useRouter } from "next/navigation";
import { HeartHandshake, MessageCircle, UserCheck, X, Send, UserX } from "lucide-react";
import ProfileImage from "@/shared/components/ProfileImage";
import {
  useAcceptedMatches,
  useReceivedMatches,
  useSentMatches,
  useAcceptMatch,
  useRejectMatch,
  useCancelMatch,
  useRemoveMatch,
  useStartConversation,
} from "@/features/matcher/hooks/useMatches";

export default function MatchesPage() {
  const router = useRouter();

  const { data: matches = [], isLoading: matchesLoading } = useAcceptedMatches();
  const { data: received = [], isLoading: receivedLoading } = useReceivedMatches();
  const { data: sent = [] } = useSentMatches();
  const acceptMutation = useAcceptMatch();
  const rejectMutation = useRejectMatch();
  const cancelMutation = useCancelMatch();
  const removeMutation = useRemoveMatch();
  const conversationMutation = useStartConversation();

  const isLoading = matchesLoading || receivedLoading;

  // "Pending interests" = incoming requests still awaiting your response.
  // /matcher/received/ returns requests of every status, so keep only the
  // pending ones. This is also what makes an accepted/rejected request vanish
  // from the list once the refetch lands — instead of lingering with a stale
  // status because it still came back in the response.
  const pending = received.filter((item) => item.status === "pending");

  // "Sent requests" must only show requests still awaiting a response — not
  // accepted (now mutual friends), rejected, cancelled or expired ones.
  const pendingSent = sent.filter((item) => item.status === "pending");

  return (
    <main className="min-h-[100dvh] px-4 pb-24 pt-5 text-[#2D2424]">
      <div className="mx-auto max-w-md">
        <header className="mb-5 rounded-3xl border border-white/55 bg-white/55 px-4 py-3 shadow-[0_8px_24px_rgba(16,24,40,0.10)] backdrop-blur-md">
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
              <p className="text-2xl font-semibold text-[#B78A3B]"> Your Matches</p>
            </div>
          </div>
        </header>

        {/* ── Skeleton loader ── */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-3 rounded-lg border border-[#EADDD2] p-4"
              >
                <div className="h-14 w-14 rounded-full bg-[#EADDD2]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-[#EADDD2]" />
                  <div className="h-3 w-1/4 rounded bg-[#EADDD2]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── only when there's nothing to show at all (no
            mutual matches AND no incoming interests waiting on you). ── */}
        {!isLoading && matches.length === 0 && pending.length === 0 && (
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-[#EADDD2] p-8 text-center">
            <div>
              <UserX className="mx-auto mb-4 h-10 w-10 text-[#7A2432]" />
              <h2 className="font-semibold">No mutual matches yet</h2>
              <p className="mt-2 text-sm leading-6 text-[#746767]">
                Show interest from Discover. When both people agree, they appear here.
              </p>
              <button
                onClick={() => router.push("/home")}
                className="glass-glossy mt-5 h-11 rounded-md px-5 text-sm font-semibold"
              >
                Go to Discover
              </button>
            </div>
          </div>
        )}

        {/* ── Accepted matches list ── */}
        <div className="space-y-3">
          {matches.map((match) => (
            <div
              key={match.id}
              className="flex items-center gap-3 rounded-lg border border-[#EADDD2] p-4"
            >
              <button
                type="button"
                onClick={() =>
                  typeof match.user_id === "number" &&
                  router.push(`/profile/${match.user_id}`)
                }
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-label={`View ${match.name || match.email}'s profile`}
              >
                <ProfileImage
                  src={match.profile_image}
                  name={match.name || match.email}
                  alt={match.name || "Match"}
                  className="h-14 w-14 shrink-0 rounded-full"
                  textClassName="text-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{match.name || match.email}</p>
                  <p className="text-sm text-[#746767]">Mutual match</p>
                </div>
              </button>
              {typeof match.user_id === "number" && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => conversationMutation.mutate(match.user_id)}
                    disabled={conversationMutation.isPending}
                    aria-label={`Message ${match.name || match.email}`}
                    className="glass-glossy grid h-10 w-10 place-items-center rounded-full disabled:opacity-50"
                  >
                    {conversationMutation.isPending ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <MessageCircle className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove your match with ${match.name || "this person"}?`)) {
                        removeMutation.mutate(match.user_id);
                      }
                    }}
                    disabled={removeMutation.isPending}
                    aria-label={`Remove match with ${match.name || match.email}`}
                    title="Remove match"
                    className="grid h-10 w-10 place-items-center rounded-full border border-[#EADDD2] text-[#7A2432] disabled:opacity-50"
                  >
                    <UserX className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Pending interests (below mutual matches) ── */}
        {!isLoading && pending.length > 0 && (
          <section className="mt-6 rounded-lg border border-[#EADDD2] p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-[#7A2432]" />
              <h2 className="font-semibold">Pending interests</h2>
            </div>
            <div className="space-y-3">
              {pending.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md p-3"
                >
                  <button
                    type="button"
                    onClick={() =>
                      item.user?.user_id != null &&
                      router.push(`/profile/${item.user.user_id}`)
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-label={`View ${item.user?.name || "profile"}`}
                  >
                    <ProfileImage
                      src={item.user?.profile_image}
                      name={item.user?.name || item.user?.email}
                      alt={item.user?.name || "Profile"}
                      className="h-12 w-12 shrink-0 rounded-full"
                      textClassName="text-base"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.user?.name || item.user?.email || "Someone"}
                      </p>
                      <p className="truncate text-xs text-[#746767]">
                        {item.match_percentage != null
                          ? `${item.match_percentage}% match · interested in you`
                          : "is interested in your profile"}
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => rejectMutation.mutate(item.id)}
                      disabled={rejectMutation.isPending}
                      aria-label="Decline"
                      className="grid h-9 w-9 place-items-center rounded-full text-[#746767] disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => acceptMutation.mutate(item.id)}
                      disabled={acceptMutation.isPending}
                      aria-label="Match back"
                      className="glass-glossy grid h-9 w-9 place-items-center rounded-full disabled:opacity-50"
                    >
                      <HeartHandshake className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Sent requests (cancellable) ── */}
        {!isLoading && pendingSent.length > 0 && (
          <section className="mt-6 rounded-lg border border-[#EADDD2] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Send className="h-5 w-5 text-[#7A2432]" />
              <h2 className="font-semibold">Sent requests</h2>
            </div>
            <div className="space-y-3">
              {pendingSent.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md p-3">
                  <div className="flex items-center gap-3">
                    <ProfileImage
                      src={item.user?.profile_image}
                      name={item.user?.name || "?"}
                      className="h-10 w-10 rounded-full"
                      textClassName="text-sm"
                    />
                    <div>
                      <p className="text-sm font-semibold">{item.user?.name || "Someone"}</p>
                      <p className="text-xs text-[#746767]">Waiting for a response</p>
                    </div>
                  </div>
                  <button
                    onClick={() => cancelMutation.mutate(item.id)}
                    disabled={cancelMutation.isPending}
                    className="glass-btn rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
