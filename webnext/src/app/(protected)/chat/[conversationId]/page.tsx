"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Ban, ChevronLeft, Flag } from "lucide-react";
import ProfileImage from "@/shared/components/ProfileImage";
import { getConversations } from "@/shared/api/chat.api";
import { blockProfile, reportProfile } from "@/shared/api/mvp.api";
import { useAuth } from "@/features/auth";
import { showSuccess, showError } from "@/shared/utils/toast";
import ChatWindow from "@/features/chat/components/ChatWindow";
import ConversationList from "@/features/chat/components/ConversationList";

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams<{ conversationId: string }>();
  const conversationIdStr = String(params.conversationId);
  const { user } = useAuth();
  const [showReport, setShowReport] = useState(false);

  // Look up the conversation so we can identify the OTHER participant
  // (needed for block/report — must NOT target yourself).
  const { data: conversationsData } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
    retry: false,
  });

  const conversation = conversationsData?.results?.find(
    (c) => String(c.id) === conversationIdStr
  );

  // Use Number() on both sides — the backend may return IDs as strings at runtime
  const other = conversation?.participants?.find(
    (p) => Number(p.id) !== Number(user?.id)
  );
  // profile_id is preferred; fall back to id so the buttons are never stuck disabled
  const otherProfileId =
    (other as { profile_id?: number } | undefined)?.profile_id ?? other?.id;

  const blockMutation = useMutation({
    mutationFn: blockProfile,
    onSuccess: () => {
      showSuccess("User blocked successfully.");
      router.push("/home");
    },
    onError: (err) => showError(err, "Failed to block user. Please try again."),
  });

  const reportMutation = useMutation({
    mutationFn: (profileId: number) =>
      reportProfile(profileId, {
        reason: "other",
        description: "Reported from chat safety controls.",
      }),
    onSuccess: () => {
      setShowReport(false);
      showSuccess("Report submitted. Thank you.");
      router.push("/home");
    },
    onError: (err) => {
      setShowReport(false);
      showError(err, "Failed to submit report. Please try again.");
    },
  });

  return (
    <div
      className="flex h-[100dvh] overflow-hidden"
      style={{ background: "linear-gradient(180deg, #ffffff 0%, #eef8ff 40%, #d7ebfb 100%)" }}
    >
      {/* ── Desktop-only sidebar (WhatsApp-style persistent list) ── */}
      <aside className="hidden lg:flex w-80 flex-shrink-0 flex-col border-r border-white/40 bg-white/60 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/40">
          <button
            type="button"
            onClick={() => router.push("/home")}
            aria-label="Go back"
            className="glass-btn grid h-9 w-9 shrink-0 place-items-center rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold text-[#2D2424]">Messages</h2>
        </div>
        <ConversationList
          activeId={conversationIdStr}
          onSelect={(id) => router.push(`/chat/${id}`)}
        />
      </aside>

      {/* ── Conversation panel: full width on mobile, right panel on desktop ── */}
      <main className="flex flex-1 flex-col min-w-0 bg-white dark:bg-gray-950">
        {/* Safety bar */}
        <div className="flex items-center gap-2 border-b border-[#EADDD2] bg-white px-3 py-2">
          {/* Back button only makes sense on mobile — desktop keeps the list visible */}
          <button
            onClick={() => router.push("/home")}
            aria-label="Go back"
            className="grid h-9 w-9 place-items-center rounded-full text-[#2D2424] lg:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2 min-w-0">
            {other && (
              <ProfileImage
                src={other.profile_picture ?? other.profile_image}
                name={other.display_name ?? other.username}
                className="h-7 w-7 rounded-full flex-shrink-0"
                textClassName="text-xs"
              />
            )}
            <span className="truncate text-sm font-semibold text-[#2D2424]">
              {other?.display_name ?? other?.username ?? "Chat"}
            </span>
          </div>
          <button
            onClick={() => setShowReport(true)}
            disabled={!otherProfileId}
            aria-label="Report"
            className="grid h-9 w-9 place-items-center rounded-full text-[#746767] disabled:opacity-40"
          >
            <Flag className="h-4 w-4" />
          </button>
          <button
            onClick={() => otherProfileId && blockMutation.mutate(otherProfileId)}
            disabled={!otherProfileId || blockMutation.isPending}
            aria-label="Block"
            className="grid h-9 w-9 place-items-center rounded-full text-[#746767] disabled:opacity-40"
          >
            <Ban className="h-4 w-4" />
          </button>
        </div>

        {/* Live WebSocket chat — mounted once */}
        <div className="min-h-0 flex-1">
          <ChatWindow conversationId={conversationIdStr} />
        </div>
      </main>

      {/* ── Report modal ── */}
      {showReport && otherProfileId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#2D2424]/50 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 text-center">
            <Flag className="mx-auto mb-3 h-8 w-8 text-[#7A2432]" />
            <h2 className="text-lg font-semibold text-[#2D2424]">
              Report this conversation?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#746767]">
              Your report goes to the safety team. The other person will not be notified.
            </p>
            <button
              onClick={() => reportMutation.mutate(otherProfileId)}
              disabled={reportMutation.isPending}
              className="mt-5 h-11 w-full rounded-md bg-[#7A2432] text-sm font-semibold text-white disabled:opacity-60"
            >
              Submit report
            </button>
            <button
              onClick={() => setShowReport(false)}
              className="mt-3 text-sm font-semibold text-[#746767]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
