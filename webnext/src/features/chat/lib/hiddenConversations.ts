import { Conversation } from '@/shared/types/chat.types'

// Locally-hidden ("deleted for me") conversations.
//
// The backend's DELETE /chat/conversations/:uuid/ returns success but still
// lists the conversation in GET /chat/conversations/, so a deleted chat
// reappears. Until the backend hides it server-side, we remember the deletion
// locally (per browser) and filter it out of the list. A chat reappears only
// if a NEWER message arrives after the moment it was deleted — matching the
// familiar WhatsApp "delete chat" behaviour.

const KEY = 'chat:hiddenConversations'

// Map of conversation id → ISO timestamp of when it was deleted.
type HiddenMap = Record<string, string>

function read(): HiddenMap {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '{}') as HiddenMap
  } catch {
    return {}
  }
}

function write(map: HiddenMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* storage unavailable — ignore */
  }
}

/** Mark a conversation as deleted-for-me as of `deletedAt` (ISO string). */
export function hideConversation(id: string, deletedAt: string): void {
  const map = read()
  map[id] = deletedAt
  write(map)
}

/** Drop a conversation from the hidden list (e.g. it became active again). */
export function unhideConversation(id: string): void {
  const map = read()
  if (id in map) {
    delete map[id]
    write(map)
  }
}

/**
 * Remove conversations that were deleted locally and have had no newer message
 * since. A conversation with a message created after its deletion is un-hidden
 * and shown again.
 */
export function filterHidden(list: Conversation[]): Conversation[] {
  const map = read()
  if (!Object.keys(map).length) return list
  return list.filter((conv) => {
    const deletedAt = map[conv.id]
    if (!deletedAt) return true
    const last = conv.last_message?.created_at
    if (last && new Date(last) > new Date(deletedAt)) {
      unhideConversation(conv.id) // new activity → bring it back
      return true
    }
    return false
  })
}
