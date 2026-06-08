import api from "@/shared/api/client";
import type {
  Conversation,
  Message,
  MessageAttachment,
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

/** GET /chat/conversations/ — sidebar list. filter: archived | unread | pinned */
export function getConversations(
  filter?: "archived" | "unread" | "pinned"
): Promise<PaginatedResponse<Conversation>> {
  return data({
    method: "GET",
    url: "/chat/conversations/",
    params: filter ? { filter } : undefined,
  });
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
export async function getMessages(
  conversationId: string,
  cursor?: string
): Promise<PaginatedResponse<Message>> {
  const res = await data<PaginatedResponse<Message>>({
    method: "GET",
    url: `/chat/conversations/${conversationId}/messages/`,
    params: cursor ? { cursor } : undefined,
  });
  // The API paginates newest-first (cursor ordering '-created_at'). Reverse each
  // page to oldest→newest so the UI renders top→bottom and live messages — which
  // are appended to the end of the cache — consistently land at the bottom.
  return { ...res, results: [...(res.results ?? [])].reverse() };
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

/**
 * POST /chat/conversations/:id/messages/ — rich variant for media / replies.
 * Goes through the same gated send service; the WS echo updates the room.
 */
export function sendChatMessage(
  conversationId: string,
  payload: {
    type?: string;
    content?: string;
    attachment_ids?: string[];
    reply_to?: string;
    client_nonce?: string;
  }
): Promise<Message> {
  return data({
    method: "POST",
    url: `/chat/conversations/${conversationId}/messages/`,
    data: payload,
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
 * Legacy route kept for back-compat. Prefer deleteMessageScoped().
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

// ─────────────────────────────────────────────────────────
// Message actions (keyed by message uuid)
// ─────────────────────────────────────────────────────────

/** PATCH /chat/messages/:uuid/edit/ — sender only, text only, within window. */
export function editMessage(messageUuid: string, content: string): Promise<Message> {
  return data({
    method: "PATCH",
    url: `/chat/messages/${messageUuid}/edit/`,
    data: { content },
  });
}

/** DELETE /chat/messages/:uuid/?scope=me|everyone */
export function deleteMessageScoped(
  messageUuid: string,
  scope: "me" | "everyone" = "me"
): Promise<void> {
  return data({
    method: "DELETE",
    url: `/chat/messages/${messageUuid}/`,
    params: { scope },
  });
}

/** PUT /chat/messages/:uuid/reactions/ */
export function addReaction(messageUuid: string, emoji: string): Promise<void> {
  return data({
    method: "PUT",
    url: `/chat/messages/${messageUuid}/reactions/`,
    data: { emoji },
  });
}

/** DELETE /chat/messages/:uuid/reactions/?emoji= */
export function removeReaction(messageUuid: string, emoji: string): Promise<void> {
  return data({
    method: "DELETE",
    url: `/chat/messages/${messageUuid}/reactions/`,
    params: { emoji },
  });
}

/** PUT/DELETE /chat/messages/:uuid/pin/ */
export function pinMessage(messageUuid: string): Promise<void> {
  return data({ method: "PUT", url: `/chat/messages/${messageUuid}/pin/` });
}
export function unpinMessage(messageUuid: string): Promise<void> {
  return data({ method: "DELETE", url: `/chat/messages/${messageUuid}/pin/` });
}

/** PUT/DELETE /chat/messages/:uuid/save/ */
export function saveMessage(messageUuid: string): Promise<void> {
  return data({ method: "PUT", url: `/chat/messages/${messageUuid}/save/` });
}
export function unsaveMessage(messageUuid: string): Promise<void> {
  return data({ method: "DELETE", url: `/chat/messages/${messageUuid}/save/` });
}

/** POST /chat/messages/:uuid/forward/ */
export function forwardMessage(
  messageUuid: string,
  conversationUuids: string[]
): Promise<{ forwarded: string[] }> {
  return data({
    method: "POST",
    url: `/chat/messages/${messageUuid}/forward/`,
    data: { conversation_uuids: conversationUuids },
  });
}

/** POST /chat/messages/:uuid/report/ */
export function reportMessage(
  messageUuid: string,
  payload: { reason: string; description?: string }
): Promise<{ detail: string }> {
  return data({
    method: "POST",
    url: `/chat/messages/${messageUuid}/report/`,
    data: payload,
  });
}

/** GET /chat/messages/:uuid/info/ — delivered/seen + edit history (own msg). */
export function getMessageInfo(messageUuid: string): Promise<{
  receipts: { user_id: number; delivered_at: string | null; seen_at: string | null }[];
  edits: { old_content: string; edited_at: string }[];
}> {
  return data({ method: "GET", url: `/chat/messages/${messageUuid}/info/` });
}

/** GET /chat/saved-messages/ */
export function getSavedMessages(): Promise<Message[]> {
  return data({ method: "GET", url: "/chat/saved-messages/" });
}

// ─────────────────────────────────────────────────────────
// Conversation actions (keyed by conversation uuid)
// ─────────────────────────────────────────────────────────

export interface ConversationStatePatch {
  is_pinned?: boolean;
  is_archived?: boolean;
  is_muted?: boolean;
  muted_until?: string | null;
  notifications_enabled?: boolean;
}

/** PATCH /chat/conversations/:uuid/ — pin/archive/mute toggles. */
export function patchConversationState(
  conversationUuid: string,
  patch: ConversationStatePatch
): Promise<Conversation> {
  return data({
    method: "PATCH",
    url: `/chat/conversations/${conversationUuid}/`,
    data: patch,
  });
}

/** DELETE /chat/conversations/:uuid/ — delete for me. */
export function deleteConversation(conversationUuid: string): Promise<void> {
  return data({ method: "DELETE", url: `/chat/conversations/${conversationUuid}/` });
}

/** POST /chat/conversations/:uuid/export/ */
export function exportConversation(conversationUuid: string): Promise<{ detail: string }> {
  return data({ method: "POST", url: `/chat/conversations/${conversationUuid}/export/` });
}

/** GET /chat/conversations/:uuid/pins/ */
export function getPinnedMessages(conversationUuid: string): Promise<Message[]> {
  return data({ method: "GET", url: `/chat/conversations/${conversationUuid}/pins/` });
}

/** POST /chat/conversations/:uuid/read/ */
export function markConversationReadApi(conversationUuid: string): Promise<void> {
  return data({ method: "POST", url: `/chat/conversations/${conversationUuid}/read/` });
}

// ─────────────────────────────────────────────────────────
// Search / media / privacy
// ─────────────────────────────────────────────────────────

export interface MessageSearchParams {
  q?: string;
  conversation?: string;
  type?: "media" | "links" | string;
  sender?: number;
  from?: string;
  to?: string;
}

export function searchMessages(
  params: MessageSearchParams
): Promise<PaginatedResponse<Message>> {
  return data({ method: "GET", url: "/chat/search/", params });
}

/** POST /chat/attachments/ — multipart upload; returns attachment to attach on send. */
export function uploadAttachment(file: File, kind: string): Promise<MessageAttachment> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  return data({
    method: "POST",
    url: "/chat/attachments/",
    data: form,
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export interface ChatPrivacy {
  allow_messages_from: string;
  who_can_send_images: string;
  last_seen_visibility: string;
  online_status_visibility: string;
  read_receipts_enabled: boolean;
}

export function getChatPrivacy(): Promise<ChatPrivacy> {
  return data({ method: "GET", url: "/chat/chat-privacy/" });
}
export function updateChatPrivacy(patch: Partial<ChatPrivacy>): Promise<ChatPrivacy> {
  return data({ method: "PATCH", url: "/chat/chat-privacy/", data: patch });
}
