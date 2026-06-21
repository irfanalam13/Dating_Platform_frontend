"use client";

import { useQuery } from "@tanstack/react-query";
import { getMessageInfo } from "@/shared/api/chat.api";

export type ReceiptStatus = "sent" | "delivered" | "read";

export interface DerivedReceipt {
  status: ReceiptStatus;
  /** ISO timestamp the message was first seen, when known. */
  seenAt: string | null;
}

/**
 * Delivery/seen state for one (own) message, derived from the per-recipient
 * receipts exposed by GET /chat/messages/:uuid/info/.
 *
 * Only the sender may read that endpoint, so this must be enabled for OWN
 * messages only. To stay cheap we fetch it for a single message at a time
 * (the most recent own message in the thread) — `isReadHint` is the live
 * `message.is_read` flag the WebSocket keeps current, so the ticks flip the
 * instant a "read" event arrives even before the receipt refetch lands.
 */
export function useMessageReceipt(
  messageUuid: string | undefined,
  enabled: boolean,
  isReadHint: boolean,
): DerivedReceipt {
  const { data } = useQuery({
    // isReadHint is part of the key so a live read event triggers a refetch
    // that pulls the precise seen_at timestamp.
    queryKey: ["message-info", messageUuid, isReadHint],
    queryFn: () => getMessageInfo(messageUuid!),
    enabled: enabled && !!messageUuid,
    staleTime: 4_000,
    // Poll until delivered/seen is known, then stop — delivery receipts are
    // written by an async task shortly after send.
    refetchInterval: (query) => {
      const receipts = query.state.data?.receipts ?? [];
      const settled = receipts.some((r) => r.seen_at || r.delivered_at);
      return settled ? false : 8_000;
    },
  });

  const receipts = data?.receipts ?? [];
  const seen = receipts.find((r) => r.seen_at);
  if (seen?.seen_at) return { status: "read", seenAt: seen.seen_at };
  // The WS read flag can lead the receipt fetch — trust it for the ticks.
  if (isReadHint) return { status: "read", seenAt: null };
  if (receipts.some((r) => r.delivered_at)) return { status: "delivered", seenAt: null };
  return { status: "sent", seenAt: null };
}
