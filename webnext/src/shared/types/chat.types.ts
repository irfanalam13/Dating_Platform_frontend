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
  username: string;
  email: string;
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
}

// ─────────────────────────────────────────────────────────
// Message
// ─────────────────────────────────────────────────────────

export interface Message {
  id: string;
  conversation: string;
  sender: ChatUser;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────
// Conversation
// ─────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  last_message: Message | null;
  unread_count: number;
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
  | WSTypingEvent
  | WSReadEvent
  | WSErrorEvent
  | WSPongEvent
  | { type: "ping" };
  
  