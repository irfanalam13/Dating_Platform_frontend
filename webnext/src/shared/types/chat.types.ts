// ─────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

// ─────────────────────────────────────────────────────────
// User — base shape used by sender on Message
// ─────────────────────────────────────────────────────────

export interface ChatUser {
  id: number;
  // Display name only — email/phone/slug are private and never sent to peers.
  full_name: string | null;
  display_name: string | null;
  is_online: boolean;
  last_seen: string | null;
}

// ─────────────────────────────────────────────────────────
// Conversation participant — extends ChatUser with
// dating-platform profile fields returned by the backend
// Must be defined BEFORE Conversation references it
// ─────────────────────────────────────────────────────────

export interface ConversationParticipant extends ChatUser {
  display_name: string | null;
  profile_picture: string | null;
  profile_image: string | null;   // ← ADD — backend may return either name
  name: string | null;            // ← ADD — backend may return either name
  age: number | null;
  // Profile PK — required for profile-level block/report (keyed off Profile.id).
  profile_id?: number | null;
}

// ─────────────────────────────────────────────────────────
// Message
// ─────────────────────────────────────────────────────────

export type MessageType =
  | "text" | "image" | "video" | "audio" | "voice"
  | "gif" | "sticker" | "document" | "location" | "contact" | "system";

export interface MessageAttachment {
  uuid: string;
  kind: string;
  url: string | null;
  thumbnail_url: string | null;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  waveform: number[] | null;
  scan_status: string;
}

export interface ReplyPreview {
  uuid: string;
  type: string;
  content: string;
  sender_id: number;
  is_deleted_for_all: boolean;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  me: boolean;
}

export interface Message {
  id: string;
  /** Stable external id used by all message-action endpoints. */
  uuid?: string;
  conversation: string;
  sender: ChatUser;
  type?: MessageType;
  content: string;
  status?: string;
  reply_to?: ReplyPreview | null;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  is_edited?: boolean;
  is_deleted_for_all?: boolean;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  /** Client-only: the server rejected this send (e.g. unmatched > 24h). */
  failed?: boolean;
  /** Client-only: rejection reason, shown under the failed bubble. */
  error?: string;
}

// ─────────────────────────────────────────────────────────
// Conversation
// ─────────────────────────────────────────────────────────

export interface ConversationMembership {
  is_pinned: boolean;
  is_archived: boolean;
  is_muted: boolean;
  muted_until?: string | null;
  notifications_enabled?: boolean;
}

export interface Conversation {
  id: string;
  uuid?: string;
  type?: string;
  participants: ConversationParticipant[];
  last_message: Message | null;
  unread_count: number;
  membership?: ConversationMembership;
  is_encrypted?: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────
// Unread counts
// ─────────────────────────────────────────────────────────

export type UnreadCounts = Record<string, number>;

export interface UnreadCountPayload {
  unread_counts: UnreadCounts;
  total: number;
  synced_at: string;
}

export interface ConversationUnreadState {
  conversationId: string;
  count: number;
}

// ─────────────────────────────────────────────────────────
// WebSocket event shapes
// ─────────────────────────────────────────────────────────

export interface WSChatMessage {
  type: "message";
  message: string;
  sender_id: string;
  sender_name: string;
  message_id: string;
  timestamp: string;
  // Rich fields from the unified send service (optional for back-compat).
  uuid?: string;
  msg_type?: MessageType;
  content?: string;
  reply_to?: string | null;
  attachments?: MessageAttachment[];
  is_edited?: boolean;
  is_deleted?: boolean;
  metadata?: Record<string, unknown>;
  client_nonce?: string;
}

export interface WSMessageEdited {
  type: "message_edited";
  message_uuid: string;
  content: string;
  edited_at: string;
}

export interface WSMessageDeleted {
  type: "message_deleted";
  message_uuid: string;
  scope: string;
}

export interface WSReactionUpdate {
  type: "reaction_update";
  message_uuid: string;
  user_id: string;
  emoji: string;
  action: "added" | "removed";
}

export interface WSAttachmentReady {
  type: "attachment_ready";
  message_uuid: string;
  attachment_uuid: string;
  scan_status: string;
}

export interface WSTypingEvent {
  type: "typing";
  user_id: string;
  is_typing: boolean;
}

export interface WSReadEvent {
  type: "read";
  reader_id: string;
  conversation_id: string;
  read_at: string;
}

export interface WSErrorEvent {
  type: "error";
  message: string;
}

export interface WSPongEvent {
  type: "pong";
  timestamp: string;
}

export type WSChatEvent =
  | WSChatMessage
  | WSMessageEdited
  | WSMessageDeleted
  | WSReactionUpdate
  | WSAttachmentReady
  | WSTypingEvent
  | WSReadEvent
  | WSErrorEvent
  | WSPongEvent
  | { type: "ping" };
  
  