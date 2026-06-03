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
  WSChatEvent,
  WSChatMessage,
  WSTypingEvent,
  WSReadEvent,
  ChatUser,
} from "@/shared/types/chat.types";
import { getFreshToken } from '@/shared/utils/wsToken'


export const chatKeys = {
  messages: (conversationId: string) =>
    ["messages", conversationId] as const,
};

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  typingUsers: Set<string>;
  wsStatus: "connecting" | "connected" | "disconnected" | "error";
  send: (text: string) => void;
  sendTyping: (isTyping: boolean) => void;
  sendRead: () => void;
}

export function useChat(conversationId: string | null): UseChatReturn {
  const currentUser                   = useAuthStore((s) => s.user) as ChatUser | null;
  const queryClient                   = useQueryClient();
  const { markConversationRead }      = useNotificationContext();

  // ✅ wsRef holds the WS instance
  const wsRef                         = useRef<ChatWebSocket | null>(null);

  // ✅ wsStatusRef mirrors wsStatus so send() always reads current value
  // without needing wsStatus in its dependency array (which causes stale closure)
  const wsStatusRef                   = useRef<UseChatReturn["wsStatus"]>("disconnected");

  const [wsStatus, setWsStatus]       = useState<UseChatReturn["wsStatus"]>("disconnected");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimers                  = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Keep wsStatusRef in sync with wsStatus state
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

  // ── WS event handler ─────────────────────────────────
  const handleWSEvent = useCallback(
    (event: WSChatEvent) => {
      switch (event.type) {

        case "message": {
          const e = event as WSChatMessage;
          const senderId = parseInt(e.sender_id, 10);
          const newMsg: Message = {
            id:           e.message_id,
            conversation: conversationId!,
            sender: {
              id:        senderId,
              username:  e.sender_name,
              email:     "",
              is_online: true,
              last_seen: null,
            },
            content:    e.message,
            is_read:    false,
            read_at:    null,
            created_at: e.timestamp,
          };

          const isOwnEcho = currentUser?.id === senderId;

          queryClient.setQueryData<{ results: Message[] }>(
            chatKeys.messages(conversationId!),
            (old) => {
              const existing = old?.results ?? [];

              // Already have this server message — ignore the duplicate.
              if (existing.some((m) => m.id === newMsg.id)) {
                return { ...old, results: existing };
              }

              // Server echo of a message we just sent → swap the matching
              // optimistic (temp) entry in place so it doesn't appear twice.
              if (isOwnEcho) {
                const tempIdx = existing.findIndex(
                  (m) => m.id.startsWith("temp-") && m.content === newMsg.content
                );
                if (tempIdx !== -1) {
                  const next = [...existing];
                  next[tempIdx] = newMsg;
                  return { ...old, results: next };
                }
              }

              return { ...old, results: [...existing, newMsg] };
            }
          );

          // Only mark read for messages from the other person, not our own echo.
          if (!isOwnEcho) {
            wsRef.current?.sendRead();
            markConversationRead(conversationId!);
          }
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
          console.error("ChatWS error:", event.message);
          break;
        }

        default:
          break;
      }
    },
    [conversationId, currentUser, queryClient, markConversationRead]
  );

  // ── WS lifecycle ─────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    if (!currentUser)    return;

    let cancelled = false                  // ✅ prevent race condition

    const connectWS = async () => {
      const token = await getFreshToken()  // ✅ always fresh token
      if (!token) {
        console.warn("useChat: no token — WS not started");
        return;
      }
      if (cancelled) return;              // ✅ component unmounted before token arrived

      // Tear down any existing connection first
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }

      console.log("useChat: connecting WS", { conversationId, userId: currentUser.id });
      updateStatus("connecting");

      const ws = new ChatWebSocket(conversationId, {
        onOpen:  () => {
          console.log("useChat: WS connected ✅");
          updateStatus("connected");
        },
        onClose: () => {
          console.log("useChat: WS closed");
          updateStatus("disconnected");
        },
        onError: () => {
          console.log("useChat: WS error");
          updateStatus("error");
        },
      });

      wsRef.current = ws;
      const unsub = ws.subscribe(handleWSEvent);
      ws.connect(token);                  // ✅ fresh token

      ws.sendRead();
      markConversationRead(conversationId);

      return unsub                        // ✅ return unsub for cleanup
    }

    let unsubFn: (() => void) | undefined  // ✅ store unsub

    connectWS().then(unsub => {
      unsubFn = unsub
    })

    return () => {
      cancelled = true                    // ✅ cancel if unmounted
      console.log("useChat: cleanup WS");
      unsubFn?.()                         // ✅ unsubscribe handlers
      wsRef.current?.disconnect();
      wsRef.current = null;
      updateStatus("disconnected");
      setTypingUsers(new Set());
    };
  }, [conversationId, currentUser, handleWSEvent, markConversationRead, updateStatus]);
  // ── Public actions ───────────────────────────────────

  // ✅ Uses wsRef directly — no stale closure on wsStatus
  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !conversationId) return;

      if (!wsRef.current) {
        console.warn("❌ wsRef.current is null — WS not initialized");
        return;
      }

      if (wsStatusRef.current !== "connected") {
        console.warn("❌ WS not connected —", wsStatusRef.current);
        return;
      }

      // ✅ Optimistic update — show the sender's own message immediately.
      // Reconciled/deduped when the server echoes it back (see "message" handler).
      if (currentUser) {
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
          content:    trimmed,
          is_read:    false,
          read_at:    null,
          created_at: new Date().toISOString(),
        };

        queryClient.setQueryData<{ results: Message[] }>(
          chatKeys.messages(conversationId),
          (old) => ({
            ...old,
            results: [...(old?.results ?? []), optimistic],
          })
        );
      }

      wsRef.current.sendMessage(trimmed);
    },
    [conversationId, currentUser, queryClient]   // reads wsStatus from ref, not deps
  );

  const sendTyping = useCallback((isTyping: boolean) => {
    wsRef.current?.sendTyping(isTyping);
  }, []);

  const sendRead = useCallback(() => {
    wsRef.current?.sendRead();
  }, []);

  return { messages, isLoading, typingUsers, wsStatus, send, sendTyping, sendRead };
}

































// "use client";

// import {
//   useEffect,
//   useCallback,
//   useRef,
//   useState,
//   useMemo,
// } from "react";
// import { useQuery, useQueryClient } from "@tanstack/react-query";
// import { getMessages, sendMessage as sendMessageHttp } from "@/shared/api/chat.api";
// import { ChatWebSocket } from "@/shared/lib/websocket";
// import { getAccessToken } from "@/shared/api/client";
// import { useAuthStore } from "@/features/auth/store/auth.store";
// import { useNotificationContext } from "@/features/notification/context/NotificationContext";
// import type {
//   Message,
//   WSChatEvent,
//   WSChatMessage,
//   WSTypingEvent,
//   WSReadEvent,
//   ChatUser,
// } from "@/shared/types/chat.types";

// export const chatKeys = {
//   messages: (conversationId: string) =>
//     ["messages", conversationId] as const,
// };

// interface UseChatReturn {
//   messages: Message[];
//   isLoading: boolean;
//   typingUsers: Set<string>;
//   wsStatus: "connecting" | "connected" | "disconnected" | "error";
//   send: (text: string) => void;
//   sendTyping: (isTyping: boolean) => void;
//   sendRead: () => void;
// }

// // ✅ Check if WebSocket is enabled via env var
// const WS_ENABLED = !!process.env.NEXT_PUBLIC_WS_URL;

// export function useChat(conversationId: string | null): UseChatReturn {
//   const currentUser                   = useAuthStore((s) => s.user) as ChatUser | null;
//   const queryClient                   = useQueryClient();
//   const { markConversationRead }      = useNotificationContext();
//   const wsRef                         = useRef<ChatWebSocket | null>(null);
//   const wsStatusRef                   = useRef<UseChatReturn["wsStatus"]>("disconnected");
//   const [wsStatus, setWsStatus]       = useState<UseChatReturn["wsStatus"]>("disconnected");
//   const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
//   const typingTimers                  = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

//   const updateStatus = useCallback((status: UseChatReturn["wsStatus"]) => {
//     wsStatusRef.current = status;
//     setWsStatus(status);
//   }, []);

//   // ── Message history ──────────────────────────────────
//   const { data, isLoading } = useQuery({
//     queryKey: chatKeys.messages(conversationId ?? ""),
//     queryFn:  () => getMessages(conversationId!),
//     enabled:  !!conversationId,
//     staleTime: WS_ENABLED ? Infinity : 0,
//     refetchInterval: WS_ENABLED ? false : 5000, // 👈 poll every 5s if no WS
//   });

//   const messages = useMemo(() => data?.results ?? [], [data]);

//   // ── WS event handler ─────────────────────────────────
//   const handleWSEvent = useCallback(
//     (event: WSChatEvent) => {
//       switch (event.type) {
//         case "message": {
//           const e = event as WSChatMessage;
//           const newMsg: Message = {
//             id:           e.message_id,
//             conversation: conversationId!,
//             sender: {
//               id:        parseInt(e.sender_id, 10),
//               username:  e.sender_name,
//               email:     "",
//               is_online: true,
//               last_seen: null,
//             },
//             content:    e.message,
//             is_read:    false,
//             read_at:    null,
//             created_at: e.timestamp,
//           };
//           queryClient.setQueryData<{ results: Message[] }>(
//             chatKeys.messages(conversationId!),
//             (old) => ({
//               ...old,
//               results: [...(old?.results ?? []), newMsg],
//             })
//           );
//           wsRef.current?.sendRead();
//           markConversationRead(conversationId!);
//           break;
//         }
//         case "typing": {
//           const e = event as WSTypingEvent;
//           const uid = e.user_id;
//           if (currentUser && uid === String(currentUser.id)) break;
//           if (e.is_typing) {
//             setTypingUsers((prev) => new Set([...prev, uid]));
//             if (typingTimers.current.has(uid)) clearTimeout(typingTimers.current.get(uid)!);
//             typingTimers.current.set(uid, setTimeout(() => {
//               setTypingUsers((prev) => { const next = new Set(prev); next.delete(uid); return next; });
//               typingTimers.current.delete(uid);
//             }, 3000));
//           } else {
//             clearTimeout(typingTimers.current.get(uid));
//             typingTimers.current.delete(uid);
//             setTypingUsers((prev) => { const next = new Set(prev); next.delete(uid); return next; });
//           }
//           break;
//         }
//         case "read": {
//           const e = event as WSReadEvent;
//           if (!currentUser) break;
//           queryClient.setQueryData<{ results: Message[] }>(
//             chatKeys.messages(e.conversation_id),
//             (old) => ({
//               ...old,
//               results: (old?.results ?? []).map((m) =>
//                 m.sender.id === currentUser.id
//                   ? { ...m, is_read: true, read_at: e.read_at }
//                   : m
//               ),
//             })
//           );
//           break;
//         }
//         case "ping":
//           break;
//         case "error": {
//           console.error("ChatWS error:", event.message);
//           break;
//         }
//         default:
//           break;
//       }
//     },
//     [conversationId, currentUser, queryClient, markConversationRead]
//   );

//   // ── WS lifecycle ─────────────────────────────────────
//   useEffect(() => {
//     // ✅ Skip WebSocket entirely if disabled
//     if (!WS_ENABLED) return;

//     if (!conversationId) return;
//     if (!currentUser) return;

//     const token = getAccessToken();
//     if (!token) {
//       console.warn("useChat: no token — WS not started");
//       return;
//     }

//     if (wsRef.current) {
//       wsRef.current.disconnect();
//       wsRef.current = null;
//     }

//     console.log("useChat: connecting WS", { conversationId, userId: currentUser.id });
//     updateStatus("connecting");

//     const ws = new ChatWebSocket(conversationId, {
//       onOpen:  () => { console.log("useChat: WS connected ✅"); updateStatus("connected"); },
//       onClose: () => { console.log("useChat: WS closed"); updateStatus("disconnected"); },
//       onError: () => { console.log("useChat: WS error"); updateStatus("error"); },
//     });

//     wsRef.current = ws;
//     const unsub = ws.subscribe(handleWSEvent);
//     ws.connect(token);
//     ws.sendRead();
//     markConversationRead(conversationId);

//     return () => {
//       console.log("useChat: cleanup WS");
//       unsub();
//       ws.disconnect();
//       wsRef.current = null;
//       updateStatus("disconnected");
//       setTypingUsers(new Set());
//     };
//   }, [conversationId, currentUser, handleWSEvent, markConversationRead, updateStatus]);

//   // ── Public actions ───────────────────────────────────
//   const send = useCallback(
//     async (text: string) => {
//       const trimmed = text.trim();
//       if (!trimmed || !conversationId) return;

//       // ✅ HTTP fallback when WS is disabled or disconnected
//       if (!WS_ENABLED || wsStatusRef.current !== "connected") {
//         try {
//           const newMsg = await sendMessageHttp(conversationId, trimmed);
//           queryClient.setQueryData<{ results: Message[] }>(
//             chatKeys.messages(conversationId),
//             (old) => ({
//               ...old,
//               results: [...(old?.results ?? []), newMsg],
//             })
//           );
//         } catch (e) {
//           console.error("Failed to send message via HTTP:", e);
//         }
//         return;
//       }

//       wsRef.current?.sendMessage(trimmed);
//     },
//     [conversationId, queryClient]
//   );

//   const sendTyping = useCallback((isTyping: boolean) => {
//     if (!WS_ENABLED) return;
//     wsRef.current?.sendTyping(isTyping);
//   }, []);

//   const sendRead = useCallback(() => {
//     if (!WS_ENABLED) return;
//     wsRef.current?.sendRead();
//   }, []);

//   // ✅ If WS disabled, always show as connected so input is never disabled
//   const effectiveStatus = WS_ENABLED ? wsStatus : "connected";

//   return { messages, isLoading, typingUsers, wsStatus: effectiveStatus, send, sendTyping, sendRead };
// }