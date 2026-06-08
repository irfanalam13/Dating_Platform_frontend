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

  const updateStatus = useCallback((status: UseChatReturn["wsStatus"]) => {
    wsStatusRef.current = status;
    setWsStatus(status);
  }, []);

  // ── Message history ──────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: chatKeys.messages(conversationId ?? ""),
    queryFn:  () => getMessages(conversationId!),
    enabled:  !!conversationId,
    staleTime: Infinity,
  });

  const messages = useMemo(() => data?.results ?? [], [data]);

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
                id: senderId, username: e.sender_name, email: "",
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
          logger.error("ChatWS error:", (event as { message: string }).message);
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
            username:  currentUser.username ?? "",
            email:     currentUser.email ?? "",
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
