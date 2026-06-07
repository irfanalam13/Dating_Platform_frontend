# MatchMakers Frontend — Detailed Onboarding Guide

> A newcomer's deep-dive into the `webnext` codebase. Read this top-to-bottom once,
> then keep it open as a reference. File paths are relative to `webnext/`.

---

## 1. What this project is

A **Next.js 16** dating/matchmaking web app called **MatchMakers**, oriented toward
Nepali / South-Asian culture (it has fields for religion, caste, gotra, gan, and
horoscope). The frontend talks to a **Django REST + WebSocket backend** hosted on Render.

The real application code lives entirely inside `webnext/`. The outer
`Dating_Platform_frontend/` is just the git repo wrapper.

### Tech stack (`package.json`)

| Concern | Library |
|---|---|
| Framework | **Next.js 16.2** (App Router) + **React 19** + **TypeScript** |
| Server data fetching/caching | **@tanstack/react-query** (React Query) |
| Client state (auth) | **zustand** |
| HTTP client | **axios** (with auth interceptors) |
| Styling | **Tailwind CSS** |
| Animations | **framer-motion** |
| Icons | **lucide-react** |
| Toasts | **react-hot-toast** |
| Forms / validation | **react-hook-form** + **zod** (available; many forms use manual validation) |
| Cookies | **js-cookie** |

### ⚠️ Critical Next.js 16 note (`AGENTS.md`)

This is **Next.js 16**, which has breaking changes from older versions. The most
visible one: **middleware is now called `proxy`**. That is why route protection lives
in `src/proxy.ts` instead of the older `middleware.ts`. Before writing framework-level
code, check `node_modules/next/dist/docs/`.

### Environment (`.env.local`)

```
NEXT_PUBLIC_API_URL = https://dating-platform-backend.onrender.com/api/v1
NEXT_PUBLIC_WS_URL  = wss://dating-platform-backend.onrender.com
```

Commented-out localhost values exist for local backend development
(`http://localhost:8000/api/v1` and `ws://localhost:8000`).

---

## 2. The big picture — 4 layers

The codebase uses a **feature-based architecture**. Mentally split `src/` into 4 layers:

```
src/
├── app/        → ROUTES. Thin pages that mostly just mount a feature component.
├── features/   → BUSINESS LOGIC, grouped by domain (auth, chat, profile, matcher,
│                  notification, core). Each has components/ + hooks/ (+ store/context).
├── shared/     → REUSABLE INFRA: api clients, types, websocket engine, ui shell, utils.
└── providers/  → app-wide React context providers.
```

**The golden rule:** pages in `app/` are *thin*. They import a component from `features/`
and render it. The real work happens in `features/`, which leans on `shared/` for API
calls, types, and utilities.

### Request flow (mental model)

```
Page (app/)
  → Feature component (features/)
    → React Query hook (features/.../hooks)
      → API function (shared/api/*.api.ts)
        → axios client (shared/api/client.ts)   ← attaches token, refreshes on 401
          → Django backend (Render)
```

For **real-time** features (chat, notifications, presence):

```
Feature context/hook
  → WebSocketManager (shared/lib/websocket.ts)
    → wss://backend
  → updates React Query cache / React context
    → UI re-renders live
```

---

## 3. App boot sequence

Understanding the order things load makes everything else click.

### `src/app/layout.tsx` — the root layout

Wraps the entire app in nested providers:

```
<html><body>
  QueryProvider        (src/providers/QueryProvider.tsx)
    Providers          (src/app/providers.tsx)
      AppChrome         (passthrough — currently does nothing)
        {your page}
```

### `src/providers/QueryProvider.tsx`

Supplies the configured React Query client (`src/shared/lib/query-client.ts`) to the
whole tree.

### `src/app/providers.tsx` — the boot brain

- Creates a React Query client (30s stale time, retry once, no refetch on focus).
- `InnerProviders` calls `useAuth()` and shows a **full-screen loading spinner** while
  auth resolves — *unless* the route is public (`/login`, `/register`, `/forgot-password`).
- Once ready, wraps children in `NotificationProvider` (the live WebSocket context) and
  mounts `AppToaster`.
- Also mounts React Query Devtools.

> Note: there are technically **two** QueryClient instances created (one in
> `QueryProvider.tsx`, one in `providers.tsx`). This is a known redundancy; both work,
> but it's worth being aware of.

### `src/app/page.tsx` — the `/` gate

A tiny client component. Waits for auth, then `router.replace`s to `/home` if
authenticated, else `/login`.

### `src/app/(protected)/layout.tsx`

Wraps every protected page in `MvpShell` — the bottom navigation bar.

---

## 4. Routing — `src/app/`

Next.js App Router: each folder with a `page.tsx` becomes a URL. **Route groups** in
parentheses organize files *without* appearing in the URL:

- `(public)/` — pages anyone can see (auth screens)
- `(protected)/` — pages requiring login

### Route → Component map

| Route | Component rendered | Client/Server | Notes |
|---|---|---|---|
| `/login` | `LoginForm` | client | email + password |
| `/register` | `RegisterForm` | client | → `/onboarding` on success |
| `/forgot-password` | inline page | client | sends reset email |
| `/reset-password` | inline page | client | `token` from `searchParams` |
| `/verify-email` | inline page | client | auto-verifies if `token` in URL |
| `/` (root) | inline gate | client | redirect to `/home` or `/login` |
| `/onboarding` | inline page | client | post-signup privacy choice → `/profile/edit` |
| `/home` | `HomePage` (core) | — | **the swipe/discover screen** |
| `/matches` | `MatchesPage` (matcher) | client | pending interests + mutual matches |
| `/chat` | inline 2-panel | client | `ConversationList` + `ChatWindow` (desktop) |
| `/chat/[conversationId]` | inline responsive | client | `MessageInbox` (mobile) / `ChatWindow` (desktop) |
| `/notification` | `NotificationHome` | — | full notification list |
| `/profile` | `ProfileClient` mode="own" | client | your own profile |
| `/profile/[id]` | `ProfileClient` mode="public" | client | someone else's; like/pass buttons |
| `/profile/edit` | `EditProfile` | — | 4-step profile wizard |
| `/profile/social-links` | `SocialLinksManager` | client | manage Instagram/Spotify/etc. |
| `/preferences` | `PreferencesPage` (core) | — | partner preferences |
| `/settings` | `SettingsPage` | — | privacy, blocks, logout |
| `/college` | inline page | client | student verification ("College Mode") |
| `/dashboard` | redirect | server | → `/home` |
| `/deactivate` | `AccountDeactivationPage` | server | reversible deactivation |
| `/delete` | `AccountDeletionPage` | server | permanent deletion (30-day grace) |
| `/help` | `HelpSectionPage` | server | help center |
| `/imageupload` | `UploadImage` (UploadSelfie) | server | selfie/post upload |
| `/test` | "Test Page Working  " | server | scratch page — safe to ignore |

---

## 5. `src/proxy.ts` — route protection (Next 16 "middleware")

Runs on every request (except static assets / API routes). The logic:

1. Reads a plain **`logged_in`** cookie (`"true"`). This is NOT the httpOnly refresh
   token — middleware physically cannot read httpOnly cookies, so the frontend sets this
   readable flag on login.
2. Logged-in user hitting a public route → redirect to `/dashboard`.
3. Logged-out user hitting a protected route → redirect to `/login?next=<intended path>`
   (so they can be returned after login).

`PUBLIC_ROUTES`: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`.

---

## 6. `src/features/` — the actual application

Every feature folder follows the same shape: `components/` (UI), `hooks/` (React Query
logic), and sometimes `store/` or `context/`.

### 6.1 `features/auth/` — Authentication (START HERE)

Everything depends on auth, so understand this first.

| File | Role |
|---|---|
| `store/auth.store.ts` | **Zustand store** holding current `user`, persisted to localStorage (`auth-storage`). This is the *live* auth state. |
| `hooks/useCurrentUser.ts` | The heart of auth. On load: checks `rt_exists` hint cookie → `refreshOnce()` for an access token → `getMe()` → syncs into Zustand. Exported as both `useCurrentUser` **and `useAuth`** (the alias used everywhere). |
| `hooks/useAuth.ts` | All auth **mutations**: `useLogin`, `useRegister`, `useVerifyEmail`, `useResendVerification`, `useForgotPassword`, `useResetPassword`, `useLogout`. Each handles token extraction, sets the `logged_in` cookie, shows toasts, and redirects. |
| `components/LoginForm.tsx` | Email + password, show/hide toggle. |
| `components/RegisterForm.tsx` | full_name, username, email, password, confirm — with live password-strength indicators (framer-motion). |
| `index.ts` | Public exports for the feature. |

**Auth journeys:**

- **Register:** form → `registerUser` → "check your email" → `/verify-email?email=...`
  → verify → `/onboarding` → `/profile/edit` → `/home`.
- **Login:** form → `loginUser` (+ a `/auth/refresh/` to get the access token) → store
  token + user + `logged_in` cookie → `/dashboard` → `/home`.
- **Logout:** `POST /auth/logout/`, clear token + Zustand + React Query cache + cookie
  → `/login`.

> The login error handler specifically detects `code === "EMAIL_NOT_VERIFIED"` and routes
> the user to `/verify-email`.

### 6.2 `features/core/` — Discovery & Preferences

| File | Role |
|---|---|
| `components/home.tsx` | **The main swiping screen.** Fetches `getDiscoverProfiles()` (`GET /matcher/recommendations/`), shows a card stack. Swipe **up = like, down = pass** — via drag, arrow keys, *or* mouse wheel. framer-motion drives the card animations and the LIKE/PASS labels. On a mutual match it pops a `MatchModal`; tapping a card opens `ViewProfileModal`. Has "Discover" / "My Type" tabs. |
| `components/preferences.tsx` | Set **your hobbies** and **partner's type**: religion, caste, gotra, gan, horoscope (chips) + free-text. Serialized to JSON and saved via `updateProfile` (PATCH `/profile/me/`). |

**Swipe flow in `home.tsx`:**
1. Load recommendations into a `queue`; `current = queue[0]`.
2. Drag past ±80px (or arrow/wheel) → `sendInterest(profileId, "like"|"pass")`
   (`POST /matcher/send/{id}/`).
3. Backend responds `{ matched: boolean }`; card animates out, queue shifts.
4. If `matched`, show `MatchModal` → "Start Conversation" creates a conversation and
   routes to `/chat/{id}`.

### 6.3 `features/matcher/` — Matches

| File | Role |
|---|---|
| `hooks/useMatches.ts` | `useAcceptedMatches`, `useReceivedMatches`, `useAcceptMatch`, `useRejectMatch`, `useStartConversation`. Mutations invalidate both match queries on success. |
| `components/MatchesPage.tsx` | Two sections: **Pending interests** (people who liked you — accept ♥ / reject ✕) and **Accepted matches** (mutual — tap message icon to open a chat). |

API (`shared/api/matcher.api.ts`): `/matcher/accepted/`, `/matcher/received/`,
`/matcher/accept/{id}/`, `/matcher/reject/{id}/`.

### 6.4 `features/chat/` — Real-time messaging

The most technically interesting feature — built on WebSockets.

| File | Role |
|---|---|
| `hooks/useChat.ts` | Central hook. Loads message history via React Query (`getMessages`), opens a `ChatWebSocket`, handles live events: incoming `message` (added to cache + auto-marked read), `typing` (3s auto-timeout per user), `read` (✓✓ receipts on your own messages). Exposes `send`, `sendTyping`, `sendRead`. |
| `components/ChatWindow.tsx` | The conversation view: header (avatar + `OnlineIndicator`), message list (`MessageBubble`), `TypingIndicator`, `MessageInput`. Auto-scrolls to bottom on new messages. |
| `components/ConversationList.tsx` | Sidebar list (`useQuery(['conversations'])`, polls every 30s). |
| `components/ConversationItem.tsx` | One conversation row: avatar, last message, unread badge, online dot. |
| `components/MessageBubble.tsx` | One message; own messages right-aligned with ✓ / ✓✓ read receipts. |
| `components/MessageInput.tsx` | Textarea; Enter sends, Shift+Enter newline; debounced typing events (1.5s). |
| `components/MessageInbox.tsx` | Mobile full-screen inbox with a horizontal match carousel + conversation cards. |
| `components/TypingIndicator.tsx` | Animated "typing…" dots. |
| `components/OnlineIndicator.tsx` | "Online" (green) or last-seen text. |

**Real-time mechanics:**

| Feature | How it works |
|---|---|
| New messages | WS `message` event → optimistic `setQueryData` into the messages cache |
| Typing | WS `typing` event → add to `typingUsers` Set, auto-clear after 3s |
| Read receipts | WS `read` event → set `is_read`/`read_at`; bubble shows ✓✓ |
| Online status | `NotificationContext.onlineUsers` Set + per-participant `is_online` fallback |

REST fallbacks exist in `shared/api/chat.api.ts` (`sendMessage`, `markMessagesRead`,
`deleteMessage`) for when the socket is down.

### 6.5 `features/notification/` — Real-time alerts & presence

| File | Role |
|---|---|
| `context/NotificationContext.tsx`   | **The ACTIVE context.** Opens a `NotificationWebSocket` and tracks `notifications[]` (max 50), `unreadCounts` per conversation, `totalUnread`, `onlineUsers` (presence), and `wsStatus`. Powers the red/amber badges on the bottom nav. Used in `providers.tsx`. |
| `hooks/useNotifications.ts` | REST hooks for the full notification page: `useNotificationList`, `useMarkNotificationsRead` (optimistic), `useMarkAllNotificationsRead`. |
| `components/NotificationBell.tsx` | Bell icon + dropdown of the 5 most recent. |
| `components/NotificationHome.tsx` | Full notification list page (`/notification`), with per-type icons and click-through navigation. |
| `components/NotificationContext.tsx` ⚠️ | **DEAD legacy duplicate.** Uses Zustand directly instead of `useAuth()`. Not imported anywhere — ignore it. |
| `api.ts` ⚠️ | **Empty/unused.** Real API is in `shared/api/notification.api.ts`. |

The WS event protocol is fully typed in `shared/types/notification.types.ts` as a
discriminated union with type guards (`isNewMessageEvent`, `isPresenceEvent`, etc.).

### 6.6 `features/profile/` — Profiles, settings, account

| File | Role |
|---|---|
| `hooks/useProfile.ts` | `useMyProfile`, `useUserProfile`, `useUpdateProfile`, `usePublicProfile`, `useSocialLinks`. |
| `components/ProfileClient.tsx` | Universal renderer for **own** *and* **public** profiles (`mode` prop). Public mode adds Like/Pass; own mode adds completion bar + edit/settings. |
| `components/ProfileCard.tsx` | Own profile display with a **completion score** (10 weighted fields) and detail sections. |
| `components/EditProfile.tsx` | **4-step wizard** (Identity → Lifestyle → Culture → Privacy). Uploads photo via multipart `POST /profile/images/upload/`, then `updateProfile`. |
| `components/SettingsPage.tsx` | Privacy toggles, "browse comfort" (anonymous/blur), blocked users list (unblock), College Mode link, logout. Uses `shared/api/mvp.api.ts`. |
| `components/SocialLinksManager.tsx` | CRUD for social links (Instagram, Spotify, LinkedIn, etc.) via `useSocialLinks`. |
| `components/SocialLinkBadge.tsx` | Renders one social link as a styled badge. |
| `components/Avatar.tsx` | Reusable initials avatar + online dot. |
| `components/UploadSelfie.tsx` | Drag-and-drop image upload with caption. **(mock submit for now)** |
| `components/ProfileView.tsx` | Toggles between `ProfileCard` and `SettingsPage`. |
| `components/viewer.tsx` | Minimal presentational public-profile viewer. |
| `components/Delete.tsx` | Account deletion flow. **(mock delays for now)** |
| `components/deactive.tsx` | Account deactivation flow. **(mock delays for now)** |
| `components/help.tsx` | Help center with searchable categories. |

---

## 7. `src/shared/` — shared infrastructure

The toolbox every feature reuses.

### 7.1 `shared/api/` — backend communication

**`client.ts` ⭐ — the single most important infra file.** A configured Axios instance:

- **3-layer token storage:** memory → sessionStorage → cookie. Deliberately **not**
  localStorage (tokens shouldn't survive across browser sessions).
- **`refreshOnce()`** — de-duplicates concurrent refresh calls into one promise.
- **Response interceptor for 401:** on an expired token it calls `/auth/refresh/`,
  **queues** any other requests that 401 in the meantime, retries them once refreshed,
  and **force-logs-out** (clears everything, redirects to `/login`) if refresh fails.
- **Request interceptor:** injects the `X-CSRFToken` header from the `csrftoken` cookie.
- `AUTH_ROUTES` are excluded from the refresh loop to avoid infinite recursion.

**Per-domain API modules** (thin, typed functions):

| File | Endpoints |
|---|---|
| `auth.api.ts` | login, register, verify_email, forgot/reset_password, resend, logout, me |
| `chat.api.ts` | conversations (list/create/get), messages (list/send/read/delete) |
| `profile.api.ts` | my/public profile, update, discover, send interest, social-links CRUD |
| `matcher.api.ts` | accepted/received matches, accept/reject |
| `notification.api.ts` | list, mark read, mark all read, unread count |
| `college.api.ts` | college-mode status, submit student verification |
| `mvp.api.ts` | privacy settings, profile settings, block/unblock, report |

### 7.2 `shared/lib/websocket.ts` — the real-time engine

A base **`WebSocketManager`** class providing:
- auto-reconnect with **exponential backoff** (2s → 30s max),
- a **30s ping** keepalive,
- token-in-URL authentication,
- a refresh on reconnect (won't reconnect on auth-failure close codes 4001/4003).

Two subclasses:
- **`ChatWebSocket`** → `/ws/chat/{conversationId}/` — `sendMessage`, `sendTyping`, `sendRead`.
- **`NotificationWebSocket`** → `/ws/notifications/` — `markRead`.

`shared/hooks/useWebSocket.ts` wraps `ChatWebSocket` in a React hook (refreshes token
before connecting). `shared/utils/wsToken.ts` exposes `getFreshToken()` used at connect time.

### 7.3 `shared/types/` — TypeScript contracts

One file per domain: `auth.types.ts`, `chat.types.ts`, `profile.types.ts`,
`matcher.types.ts`, `notification.types.ts` (plus an empty `index.ts`). The notification
types are the richest — a full discriminated union of WS events with type guards.

Key shapes to know: `User`, `Profile` / `PublicProfile`, `Conversation` / `Message`,
`Notification`, `PaginatedResponse<T>` (`{ count, next, previous, results }`).

### 7.4 `shared/ui/` — app shell

| File | Role |
|---|---|
| `mvp-shell.tsx` | **Bottom navigation bar** (Home, Matches, Chat, Alerts, Profile) with live unread badges from `NotificationContext`. Hidden inside a chat thread and the profile editor. |
| `toaster.tsx` | Global `react-hot-toast` container + window error / unhandled-rejection catchers. |
| `sidebar.tsx` | Legacy — fully commented out. |
| `app-chrome.tsx` | Passthrough wrapper that currently renders children only. |

### 7.5 `shared/utils/` & `shared/lib/`

| File | Role |
|---|---|
| `utils/toast.tsx` | `showSuccess` / `showError` with smart error-message extraction from API error shapes. Used everywhere. |
| `utils/wsToken.ts` | `getFreshToken()` for WebSocket auth. |
| `utils/time.ts` | `formatTime` (relative timestamps). |
| `utils/profileAdapter.ts` | Legacy — fully commented out. |
| `lib/helpers.ts` | `formatTime`, `formatLastSeen`, `getInitials`, `clsx`, `debounceTyping`. |
| `lib/query-client.ts` | The shared React Query client config (5-min stale, 30-min gc). |
| `lib/utils.ts` | Empty placeholder. |

---

## 8. `src/providers/`

`QueryProvider.tsx` — the outermost provider; supplies the React Query client from
`shared/lib/query-client.ts` to the entire tree.

---

## 9. Auth model in one paragraph

The backend uses an **httpOnly refresh cookie** (JS can't read it) plus a short-lived
**access token** kept in JS (memory/sessionStorage/cookie). On login the frontend also
sets a readable **`logged_in=true`** cookie so `proxy.ts` can gate routes at the edge.
When any API call returns 401, the Axios interceptor silently refreshes the access token
via `/auth/refresh/` and retries; if that fails, it force-logs-out. A `rt_exists` hint
cookie lets `useCurrentUser` skip the refresh attempt entirely when there's no session.

---

## 10. "Watch out" notes for newcomers

These are real observations — not urgent bugs, but good to know so you don't get confused:

1. **Dead / duplicate code exists.** When in doubt, trust whatever is wired into
   `app/providers.tsx`:
   - Two `NotificationContext.tsx` files — the one in **`context/`** is live; the one in
     **`components/`** is dead.
   - Two unused auth implementations: `shared/store/auth.ts` and
     `shared/context/auth-context.tsx`. The *live* auth is `features/auth/store/auth.store.ts`.
   - `features/notification/api.ts`, `shared/types/index.ts`, `shared/lib/utils.ts`,
     `shared/ui/sidebar.tsx`, `shared/utils/profileAdapter.ts` are empty or commented out.
2. **Mock account actions.** `Delete.tsx`, `deactive.tsx`, and `UploadSelfie.tsx`
   simulate with timers instead of calling the backend.
3. **Debug `console.log`s** remain in the auth/API code (`  Token stored`, etc.).
4. **Two `formatTime` functions** exist (`lib/helpers.ts` vs `utils/time.ts`) with
   slightly different output — make sure you import the one you mean.
5. **Two QueryClient instances** are created (in `QueryProvider.tsx` and `providers.tsx`).

---

## 11. Suggested reading order to get productive

1. `shared/api/client.ts` — token handling & the 401 refresh interceptor.
2. `features/auth/hooks/useCurrentUser.ts` + `features/auth/hooks/useAuth.ts` — the auth lifecycle.
3. `app/providers.tsx` — how the app boots.
4. `features/core/components/home.tsx` — the core product (swiping/discovery).
5. `features/chat/hooks/useChat.ts` + `shared/lib/websocket.ts` — real-time messaging.

---

## 12. "Where do I go to…?" — practical edit map

This is the quick-reference cheat sheet. The detailed how-to for each follows in
sections 13–14.

| I want to… | Go to… |
|---|---|
| Change how a page **looks** (layout, colors, spacing) | The **feature component** that the page renders, e.g. `features/core/components/home.tsx` — *not* the file in `app/`. |
| Change **global look** (background, fonts, glass effects, the bottom nav pill) | `src/app/globals.css` |
| Change the **bottom navigation bar** (icons, order, which routes show) | `src/shared/ui/mvp-shell.tsx` |
| Change **toast / notification popup styling** | `src/shared/utils/toast.tsx` |
| Add a **feature/behavior** to an existing page | The feature's `components/` (UI) + `hooks/` (data). See §13. |
| Add a **new page / route** | Create a folder under `src/app/(protected)/` or `(public)/` with a `page.tsx`. See §14. |
| Call a **new backend endpoint** | Add a function in the matching `src/shared/api/*.api.ts`, then wrap it in a hook. See §14.3. |
| Make a route **require login** | Put its folder inside `(protected)/`, and add it to `proxy.ts` logic if needed. |
| Change **fonts / Tailwind theme** | `tailwind.config.cjs` (theme) + `globals.css` (font import). |

---

## 13. Changing UI/UX and adding features to a page

### 13.1 The rule: edit the feature component, not the `app/` page

Pages in `src/app/` are intentionally thin — most just mount one feature component.
So to change what a page looks like or does, **follow the import** from the page file
to its feature component, and edit *that*.

**Example — the Home/Discover screen:**

```
src/app/(protected)/home/page.tsx   ← just renders <HomePage />   (don't edit here)
        │ imports
        ▼
src/features/core/components/home.tsx   ← EDIT HERE for UI + behavior
```

To find the right file for any route, use the **Route → Component map in §4**, then
open that component under `src/features/.../components/`.

### 13.2 How styling works in this app

Styling is **Tailwind CSS utility classes** written directly in the JSX `className`,
plus a few custom global classes defined in `src/app/globals.css`.

- **Per-element styling** → edit the Tailwind classes inline in the component.
  Example: `className="rounded-2xl bg-white px-4 py-3 shadow-lg"`.
- **Reusable custom classes** (defined in `globals.css`):
  - `glass-btn` — frosted-glass button
  - `bottom-nav-glass`, `bottom-nav-item`, `.activated` — the bottom nav pill
  - `log-font` — the "Beau Rivage" cursive logo font
  - `scrollbar-hide` — hides scrollbars
- **App-wide visuals** live in `globals.css`:
  - The page **background gradient** (white → light blue) is on `body`.
  - Fonts are imported at the top (`@import url(...Beau+Rivage...)`).

> ⚠️ **Big styling footgun — read this.** `globals.css` contains these global overrides:
> ```css
> [class*="border"]   { border-color: rgba(255,255,255,0.45) !important; ... }
> [class*="border-2"] { border-color: rgba(255,255,255,0.55) !important; }
> ```
> This means **any element whose className contains "border" gets a forced translucent
> white border + blur + shadow**, regardless of the Tailwind border color you set
> (e.g. `border-red-500` will be ignored). If your borders won't change color, this rule
> is why. To use a real border color, either edit/remove this rule or apply the color via
> inline `style={{ borderColor: "..." }}` (inline styles beat the `!important` class rule
> only if you also mark them important, so usually it's cleaner to scope down this global
> rule).

There is **no dark-mode theming system** wired up and `tailwind.config.cjs` has an empty
`theme.extend` — so custom colors are written as literal hex values throughout
(e.g. the brand maroon `#7A2432`, accent red `#DC143C`, amber `#B78A3B`). If you want a
real design system, add tokens to `tailwind.config.cjs` under `theme.extend.colors`.

### 13.3 Common brand colors used across the app

| Color | Hex | Used for |
|---|---|---|
| Brand maroon | `#7A2432` | primary buttons, badges, spinners |
| Accent red | `#DC143C` / `#FF0000` | active states, like actions |
| Amber | `#B78A3B` | chat unread badge |
| Warm cream | `#FEF6F0`, `#EADDD2` | notification backgrounds, borders |
| Text dark | `#2D2424`, `#746767` | headings / muted text |

Keep using these for consistency until/unless a design-token system is introduced.

### 13.4 Adding a *feature* to an existing page

A "feature" = new UI + (usually) new data. Two parts:

**A. The data/logic part → a hook in the feature's `hooks/` folder.**
React Query hooks own all server communication. Pattern (read query):

```ts
// features/<feature>/hooks/useThing.ts
import { useQuery } from "@tanstack/react-query";
import { getThing } from "@/shared/api/<feature>.api";

export function useThing(id: string) {
  return useQuery({
    queryKey: ["thing", id],
    queryFn: () => getThing(id),
    enabled: !!id,
  });
}
```

Pattern (mutation — writes/updates, with cache refresh + toast):

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateThing } from "@/shared/api/<feature>.api";
import { showSuccess, showError } from "@/shared/utils/toast";

export function useUpdateThing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateThing,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thing"] });  // refetch fresh data
      showSuccess("Saved!");
    },
    onError: (err) => showError(err, "Could not save."),
  });
}
```

**B. The UI part → a component in the feature's `components/` folder**, which calls
your hook and renders the result. Then drop that component into the page's existing
feature component.

> Convention reminders when adding code:
> - Mark interactive components with `"use client";` at the top.
> - Import with the `@/` alias (it maps to `src/` — see `tsconfig.json`).
> - Reuse `showSuccess` / `showError` from `shared/utils/toast` instead of inventing toasts.
> - Reuse shared types from `shared/types/` instead of redefining shapes.

---

## 14. Adding a NEW page (and wiring up its API)

### 14.1 Create the route file

Next.js App Router is **folder-based**: a folder containing `page.tsx` becomes a URL.
Decide whether the page needs login:

- **Needs login** → create under `src/app/(protected)/`
- **Public (no login)** → create under `src/app/(public)/`

```
src/app/(protected)/favorites/page.tsx     →  /favorites
src/app/(protected)/events/[eventId]/page.tsx  →  /events/:eventId  (dynamic param)
```

Keep the page thin — render a feature component:

```tsx
// src/app/(protected)/favorites/page.tsx
import FavoritesPage from "@/features/favorites/components/FavoritesPage";

export default function Page() {
  return <FavoritesPage />;
}
```

Then build the real screen in `src/features/favorites/components/FavoritesPage.tsx`
(add `"use client";` if it uses hooks/state/events).

**Dynamic routes** (`[id]`): the segment becomes a param. In Next 16 / React 19, params
arrive as a Promise — unwrap with `use()` (see the existing
`app/(protected)/profile/[id]/page.tsx` for the exact pattern):

```tsx
"use client";
import { use } from "react";

export default function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  // ...
}
```

### 14.2 Auth gating for the new page

- Putting the folder inside **`(protected)/`** gives it the bottom-nav shell
  (via `app/(protected)/layout.tsx`).
- **Edge protection** is handled by `src/proxy.ts`. By default *any* route not listed in
  `PUBLIC_ROUTES` is treated as protected and redirects logged-out users to `/login`.
  So a new protected page needs **no change** to `proxy.ts`.
- If you add a **new public page**, you MUST add its path to `PUBLIC_ROUTES` in
  `src/proxy.ts` (and to `PUBLIC_ROUTES` in `src/app/providers.tsx` if you want to skip
  the auth-loading spinner on it).
- If you want the page hidden from the bottom nav or to hide the nav on it, update
  `src/shared/ui/mvp-shell.tsx` (`nav` array, and the `hideNav` condition).

### 14.3 Wiring the API — IMPORTANT: there is no Next.js API route layer here

This app does **NOT** use Next.js API routes / route handlers (`app/api/...`). All data
comes from the **external Django backend**. "API routing" here means: add a function that
calls the backend through the shared axios client. Three steps:

**Step 1 — add the endpoint function** in the matching `src/shared/api/*.api.ts`
(or create a new `favorites.api.ts`). Always import the shared `api` client so you get
auth tokens + the 401-refresh interceptor for free:

```ts
// src/shared/api/favorites.api.ts
import api from "@/shared/api/client";
import type { Profile } from "@/shared/types/profile.types";

export const getFavorites = async (): Promise<Profile[]> => {
  const res = await api.get("/favorites/");          // → GET  {API_URL}/favorites/
  return res.data;
};

export const addFavorite = async (profileId: number): Promise<{ message: string }> => {
  const res = await api.post(`/favorites/${profileId}/`);
  return res.data;
};
```

- The base URL (`NEXT_PUBLIC_API_URL`) is already configured on the `api` client, so use
  **relative paths** like `/favorites/`.
- Never call `axios` or `fetch` directly for authed calls — always go through
  `@/shared/api/client` so tokens and refresh-on-401 are applied.
- Add/extend the response types in `src/shared/types/`.

**Step 2 — wrap it in a React Query hook** under your feature's `hooks/` (see §13.4).

**Step 3 — consume the hook** in your feature component.

Full chain for a new page:

```
app/(protected)/favorites/page.tsx
  → features/favorites/components/FavoritesPage.tsx   (UI, "use client")
    → features/favorites/hooks/useFavorites.ts        (React Query)
      → shared/api/favorites.api.ts                   (axios call)
        → shared/api/client.ts                        (auth + refresh)
          → Django backend  GET /favorites/
```

### 14.4 New-page checklist

- [ ] Folder + `page.tsx` created under the correct route group (`(protected)` / `(public)`).
- [ ] Page renders a feature component; real work lives in `features/`.
- [ ] `"use client";` added to any component using hooks/state/events.
- [ ] API function added in `shared/api/*.api.ts` using the shared `api` client.
- [ ] Types added/updated in `shared/types/`.
- [ ] React Query hook created in the feature's `hooks/`.
- [ ] If public: added to `PUBLIC_ROUTES` in `proxy.ts` (and `providers.tsx`).
- [ ] If it should appear in the bottom nav: updated `shared/ui/mvp-shell.tsx`.
- [ ] Imports use the `@/` alias.

---

## 15. Running the project

```bash
npm install      # install dependencies
npm run dev      # start dev server  → http://localhost:3000
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```

Docker is also available (`Dockerfile`, `docker-compose*.yml`). The app points at the
hosted Render backend by default; switch `.env.local` to the localhost values to run
against a local Django backend.
