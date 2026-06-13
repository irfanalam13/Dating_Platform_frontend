"use client";

import {
  useEffect,
  useCallback,
  useRef,
  useState,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMessages } from "@/shared/api/chat.api";
import { ChatWebSocket } from "@/shared/lib/websocket";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useNotificationContext } from "@/features/notification/context/NotificationContext";
import type {
  Message,
  ReplyPreview,
  WSChatEvent,
  WSChatMessage,
  WSTypingEvent,
  WSReadEvent,
  WSMessageEdited,
  WSMessageDeleted,
  WSReactionUpdate,
  WSAttachmentReady,
  ChatUser,
} from "@/shared/types/chat.types";
import { getFreshToken } from '@/shared/utils/wsToken'
import { logger } from "@/shared/utils/logger";


export const chatKeys = {
  messages: (conversationId: string) =>
    ["messages", conversationId] as const,
};

/** Lightweight reply target supplied by the composer. */
export interface ReplyTarget {
  uuid: string;
  content: string;
  sender_id: number;
  type?: string;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  typingUsers: Set<string>;
  wsStatus: "connecting" | "connected" | "disconnected" | "error";
  send: (text: string, replyTo?: ReplyTarget | null) => void;
  sendTyping: (isTyping: boolean) => void;
  sendRead: () => void;
}

export function useChat(conversationId: string | null): UseChatReturn {
  const currentUser                   = useAuthStore((s) => s.user) as ChatUser | null;
  const queryClient                   = useQueryClient();
  const { markConversationRead }      = useNotificationContext();

  const wsRef                         = useRef<ChatWebSocket | null>(null);
  const wsStatusRef                   = useRef<UseChatReturn["wsStatus"]>("disconnected");

  const [wsStatus, setWsStatus]       = useState<UseChatReturn["wsStatus"]>("disconnected");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimers                  = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Messages whose send was rejected by the server (e.g. "user not in matches
  // list" once the 24h unmatch grace lapses). Kept OUTSIDE the React Query cache
  // so the 5s polling refetch can't wipe the failure + its reason from view.
  const lastSentRef                   = useRef<string | null>(null);
  const [failedMessages, setFailedMessages] = useState<Message[]>([]);

  const updateStatus = useCallback((status: UseChatReturn["wsStatus"]) => {
    wsStatusRef.current = status;
    setWsStatus(status);
  }, []);

  // ── Message history ──────────────────────────────────
  // The WebSocket delivers messages instantly when it's healthy, but it can drop
  // events (reconnects, token refresh, backgrounded tab). A short polling + focus
  // refetch is the safety net so a new message always shows WITHOUT a manual
  // refresh. Safe to refetch-replace here: the chat only renders the latest page
  // (no scrolled-back history to clobber).
  const { data, isLoading } = useQuery({
    queryKey: chatKeys.messages(conversationId ?? ""),
    queryFn:  () => getMessages(conversationId!),
    enabled:  !!conversationId,
    staleTime: 3_000,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Always render in chronological order (oldest → newest, newest at the
  // bottom) regardless of how items were inserted — initial page, optimistic
  // send, or a live WS message from the other person. Sorting by created_at is
  // the deterministic fix: an incoming message can never jump to the top.
  const messages = useMemo(() => {
    const list = data?.results ?? [];
    // Failed (rejected) sends are merged in so they stay visible — right under
    // the messages the user just sent — even across polling refetches.
    return [...list, ...failedMessages].sort(
      (a, b) =>
        new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    );
  }, [data, failedMessages]);

  // A different conversation starts with a clean slate of failures. Resetting
  // the state during render via a prev-value tracker (instead of in an effect)
  // avoids the extra render an effect would cause; the dedup ref is cleared in
  // a small effect since ref writes don't belong in render.
  const [prevConversationId, setPrevConversationId] = useState(conversationId);
  if (conversationId !== prevConversationId) {
    setPrevConversationId(conversationId);
    setFailedMessages([]);
  }
  useEffect(() => {
    lastSentRef.current = null;
  }, [conversationId]);

  // Helper: patch the cached message list.
  const patchMessages = useCallback(
    (updater: (list: Message[]) => Message[]) => {
      if (!conversationId) return;
      queryClient.setQueryData<{ results: Message[] }>(
        chatKeys.messages(conversationId),
        (old) => ({ ...old, results: updater(old?.results ?? []) })
      );
    },
    [conversationId, queryClient]
  );

  // ── WS event handler ─────────────────────────────────
  const handleWSEvent = useCallback(
    (event: WSChatEvent) => {
      switch (event.type) {

        case "message": {
          const e = event as WSChatMessage;
          const senderId = parseInt(e.sender_id, 10);
          const content = e.content ?? e.message;
          const isOwnEcho = currentUser?.id === senderId;

          patchMessages((existing) => {
            // Resolve a reply preview from messages already in the cache.
            let replyPreview: ReplyPreview | null = null;
            if (e.reply_to) {
              const ref = existing.find((m) => m.uuid === e.reply_to);
              if (ref) {
                replyPreview = {
                  uuid: ref.uuid!, type: ref.type ?? "text",
                  content: ref.content, sender_id: Number(ref.sender.id),
                  is_deleted_for_all: !!ref.is_deleted_for_all,
                };
              }
            }

            const newMsg: Message = {
              id: e.message_id,
              uuid: e.uuid,
              conversation: conversationId!,
              sender: {
                id: senderId, full_name: e.sender_name, display_name: e.sender_name,
                is_online: true, last_seen: null,
              },
              type: e.msg_type ?? "text",
              content,
              reply_to: replyPreview,
              attachments: e.attachments ?? [],
              reactions: [],
              is_edited: e.is_edited ?? false,
              is_deleted_for_all: e.is_deleted ?? false,
              is_read: false,
              read_at: null,
              created_at: e.timestamp,
            };

            // Dedup by uuid (or legacy id).
            if (existing.some((m) =>
              (newMsg.uuid && m.uuid === newMsg.uuid) || String(m.id) === String(newMsg.id))) {
              return existing;
            }
            // Own echo → swap the optimistic temp entry in place.
            if (isOwnEcho) {
              const tempIdx = existing.findIndex(
                (m) => String(m.id ?? "").startsWith("temp-") && m.content === newMsg.content
              );
              if (tempIdx !== -1) {
                const next = [...existing];
                next[tempIdx] = newMsg;
                return next;
              }
            }
            return [...existing, newMsg];
          });

          if (!isOwnEcho) {
            wsRef.current?.sendRead();
            markConversationRead(conversationId!);
          }
          break;
        }

        case "message_edited": {
          const e = event as WSMessageEdited;
          patchMessages((list) => list.map((m) =>
            m.uuid === e.message_uuid
              ? { ...m, content: e.content, is_edited: true }
              : m
          ));
          break;
        }

        case "message_deleted": {
          const e = event as WSMessageDeleted;
          patchMessages((list) => list.map((m) =>
            m.uuid === e.message_uuid
              ? { ...m, content: "", is_deleted_for_all: true, attachments: [] }
              : m
          ));
          break;
        }

        case "reaction_update": {
          const e = event as WSReactionUpdate;
          const mine = currentUser ? String(currentUser.id) === e.user_id : false;
          patchMessages((list) => list.map((m) => {
            if (m.uuid !== e.message_uuid) return m;
            const reactions = [...(m.reactions ?? [])];
            const idx = reactions.findIndex((r) => r.emoji === e.emoji);
            if (e.action === "added") {
              if (idx === -1) reactions.push({ emoji: e.emoji, count: 1, me: mine });
              else reactions[idx] = {
                ...reactions[idx],
                count: reactions[idx].count + 1,
                me: reactions[idx].me || mine,
              };
            } else if (idx !== -1) {
              const count = reactions[idx].count - 1;
              if (count <= 0) reactions.splice(idx, 1);
              else reactions[idx] = {
                ...reactions[idx], count,
                me: mine ? false : reactions[idx].me,
              };
            }
            return { ...m, reactions };
          }));
          break;
        }

        case "attachment_ready": {
          const e = event as WSAttachmentReady;
          patchMessages((list) => list.map((m) =>
            m.uuid === e.message_uuid
              ? {
                  ...m,
                  attachments: (m.attachments ?? []).map((a) =>
                    a.uuid === e.attachment_uuid
                      ? { ...a, scan_status: e.scan_status }
                      : a
                  ),
                }
              : m
          ));
          break;
        }

        case "typing": {
          const e = event as WSTypingEvent;
          const uid = e.user_id;
          if (currentUser && uid === String(currentUser.id)) break;

          if (e.is_typing) {
            setTypingUsers((prev) => new Set([...prev, uid]));
            if (typingTimers.current.has(uid)) {
              clearTimeout(typingTimers.current.get(uid)!);
            }
            typingTimers.current.set(
              uid,
              setTimeout(() => {
                setTypingUsers((prev) => {
                  const next = new Set(prev);
                  next.delete(uid);
                  return next;
                });
                typingTimers.current.delete(uid);
              }, 3000)
            );
          } else {
            clearTimeout(typingTimers.current.get(uid));
            typingTimers.current.delete(uid);
            setTypingUsers((prev) => {
              const next = new Set(prev);
              next.delete(uid);
              return next;
            });
          }
          break;
        }

        case "read": {
          const e = event as WSReadEvent;
          if (!currentUser) break;
          queryClient.setQueryData<{ results: Message[] }>(
            chatKeys.messages(e.conversation_id),
            (old) => ({
              ...old,
              results: (old?.results ?? []).map((m) =>
                m.sender.id === currentUser.id
                  ? { ...m, is_read: true, read_at: e.read_at }
                  : m
              ),
            })
          );
          break;
        }
        case "ping":
          break
        case "error": {
          const reason = (event as { message: string }).message;
          logger.error("ChatWS error:", reason);
          // Attach the failure to the message the user just tried to send: pull
          // the optimistic temp out of the cache and into `failedMessages` so it
          // renders as "not delivered" with the reason underneath it.
          const tempId = lastSentRef.current;
          if (tempId) {
            let failed: Message | undefined;
            patchMessages((list) => {
              const found = list.find((m) => m.id === tempId);
              if (found) failed = { ...found, failed: true, error: reason };
              return list.filter((m) => m.id !== tempId);
            });
            if (failed) setFailedMessages((prev) => [...prev, failed as Message]);
            lastSentRef.current = null;
          }
          break;
        }

        default:
          break;
      }
    },
    [conversationId, currentUser, queryClient, markConversationRead, patchMessages]
  );

  // ── WS lifecycle ─────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    if (!currentUser)    return;

    let cancelled = false

    const connectWS = async () => {
      const token = await getFreshToken()
      if (!token) {
        logger.warn("useChat: no token — WS not started");
        return;
      }
      if (cancelled) return;

      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }

      logger.log("useChat: connecting WS", { conversationId, userId: currentUser.id });
      updateStatus("connecting");

      const ws = new ChatWebSocket(conversationId, {
        onOpen:  () => {
          logger.log("useChat: WS connected  ");
          updateStatus("connected");
        },
        onClose: () => {
          logger.log("useChat: WS closed");
          updateStatus("disconnected");
        },
        onError: () => {
          logger.log("useChat: WS error");
          updateStatus("error");
        },
      });

      wsRef.current = ws;
      const unsub = ws.subscribe(handleWSEvent);
      ws.connect(token);

      ws.sendRead();
      markConversationRead(conversationId);

      return unsub
    }

    let unsubFn: (() => void) | undefined

    connectWS().then(unsub => {
      unsubFn = unsub
    })

    return () => {
      cancelled = true
      logger.log("useChat: cleanup WS");
      unsubFn?.()
      wsRef.current?.disconnect();
      wsRef.current = null;
      updateStatus("disconnected");
      setTypingUsers(new Set());
    };
  }, [conversationId, currentUser, handleWSEvent, markConversationRead, updateStatus]);

  // ── Public actions ───────────────────────────────────
  const send = useCallback(
    (text: string, replyTo?: ReplyTarget | null) => {
      const trimmed = text.trim();
      if (!trimmed || !conversationId) return;

      if (!wsRef.current) {
        logger.warn("❌ wsRef.current is null — WS not initialized");
        return;
      }
      if (wsStatusRef.current !== "connected") {
        logger.warn("❌ WS not connected —", wsStatusRef.current);
        return;
      }

      if (currentUser) {
        const replyPreview: ReplyPreview | null = replyTo
          ? {
              uuid: replyTo.uuid, type: replyTo.type ?? "text",
              content: replyTo.content, sender_id: replyTo.sender_id,
              is_deleted_for_all: false,
            }
          : null;

        const optimistic: Message = {
          id:           `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          conversation: conversationId,
          sender: {
            id:        currentUser.id,
            full_name:    currentUser.full_name ?? null,
            display_name: currentUser.full_name ?? null,
            is_online: true,
            last_seen: null,
          },
          type:       "text",
          content:    trimmed,
          reply_to:   replyPreview,
          attachments: [],
          reactions:  [],
          is_read:    false,
          read_at:    null,
          created_at: new Date().toISOString(),
        };

        patchMessages((list) => [...list, optimistic]);
        // Remember this send so a server rejection ("error" event) can be tied
        // back to it and shown as failed right under the thread.
        lastSentRef.current = optimistic.id;
      }

      wsRef.current.sendMessage(trimmed, replyTo ? { replyTo: replyTo.uuid } : undefined);
    },
    [conversationId, currentUser, patchMessages]
  );

  const sendTyping = useCallback((isTyping: boolean) => {
    wsRef.current?.sendTyping(isTyping);
  }, []);

  const sendRead = useCallback(() => {
    wsRef.current?.sendRead();
  }, []);

  return { messages, isLoading, typingUsers, wsStatus, send, sendTyping, sendRead };
}
