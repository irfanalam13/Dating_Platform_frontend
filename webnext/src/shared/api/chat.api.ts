import api from "@/shared/api/client";
import type {
  Conversation,
  Message,
  PaginatedResponse,
} from "@/shared/types/chat.types";

// ─────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────

function data<T>(config: Parameters<typeof api.request>[0]): Promise<T> {
  return api.request<T>(config).then((res) => res.data);
}

// ─────────────────────────────────────────────────────────
// Conversations
// ─────────────────────────────────────────────────────────

/** GET /chat/conversations/ — sidebar list, ordered by updated_at desc */
export function getConversations(): Promise<PaginatedResponse<Conversation>> {
  return data({ method: "GET", url: "/chat/conversations/" });
}

/**
 * POST /chat/conversations/create/
 * Returns existing conversation or creates new 1-to-1.
 */
export function createOrGetConversation(
  participantId: number
): Promise<Conversation> {
  return data({
    method: "POST",
    url: "/chat/conversations/create/",
    data: { participant_id: participantId },
  });
}

/**
 * GET /chat/conversations/:id/
 * Single conversation — used to hydrate the chat header.
 */
export function getConversation(conversationId: string): Promise<Conversation> {
  return data({
    method: "GET",
    url: `/chat/conversations/${conversationId}/`,
  });
}

// ─────────────────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────────────────

/**
 * GET /chat/conversations/:id/messages/
 * Cursor-paginated history, oldest → newest.
 * Pass cursor from response.next for infinite scroll.
 */
export function getMessages(
  conversationId: string,
  cursor?: string
): Promise<PaginatedResponse<Message>> {
  return data({
    method: "GET",
    url: `/chat/conversations/${conversationId}/messages/`,
    params: cursor ? { cursor } : undefined,
  });
}

/**
 * POST /chat/conversations/:id/messages/
 * REST fallback only — normal path is ChatConsumer WebSocket.
 * Use when WS is disconnected.
 */

export function sendMessage(
  conversationId: string,
  content: string
): Promise<Message> {
  return data({
    method: "POST",
    url: `/chat/conversations/${conversationId}/messages/`,
    data: { content },
  });
}



// export async function sendMessage(conversationId: string, content: string) {
//   const res = await api.post(`/chat/conversations/${conversationId}/messages/`, { content });
//   return res.data;
// }


/**
 * PATCH /chat/conversations/:id/messages/read/
 * Marks all unread messages as read.
 * REST fallback — normal path is WS read event.
 */
export function markMessagesRead(conversationId: string): Promise<void> {
  return data({
    method: "PATCH",
    url: `/chat/conversations/${conversationId}/messages/read/`,
  });
}

/**
 * DELETE /chat/conversations/:id/messages/:messageId/
 * Only the sender can delete their own message.
 */
export function deleteMessage(
  conversationId: string,
  messageId: string
): Promise<void> {
  return data({
    method: "DELETE",
    url: `/chat/conversations/${conversationId}/messages/${messageId}/`,
  });
}
