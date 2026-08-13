"use client";

import { useEffect, useRef, useState } from "react";
import { toast, type Toast } from "react-hot-toast";
import { AlertCircle, CheckCircle2, RotateCcw, X } from "lucide-react";

type ToastSource = string | Error | unknown;

// Keys that hold a human message but should NOT be prefixed with a field label.
const META_KEYS = new Set([
	"detail",
	"message",
	"error",
	"errors",
	"non_field_errors",
	"__all__",
]);

const MAX_LENGTH = 320;

function truncate(text: string): string {
	const clean = text.replace(/\s+/g, " ").trim();
	return clean.length > MAX_LENGTH ? `${clean.slice(0, MAX_LENGTH - 1)}…` : clean;
}

function looksLikeHtml(text: string): boolean {
	return /^\s*<(?:!doctype|html|head|body|\?xml)/i.test(text);
}

// Turn a backend field name into a readable label: "first_name" → "First name".
function humanizeField(field: string): string {
	if (META_KEYS.has(field)) return "";
	const spaced = field.replace(/[._]+/g, " ").trim();
	if (!spaced) return "";
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Flatten any nested value (string / number / array / object) into leaf messages.
function leafMessages(value: unknown): string[] {
	if (typeof value === "string") return value.trim() ? [value.trim()] : [];
	if (typeof value === "number" || typeof value === "boolean") return [String(value)];
	if (Array.isArray(value)) return value.flatMap(leafMessages);
	if (value && typeof value === "object") {
		return Object.values(value as Record<string, unknown>).flatMap(leafMessages);
	}
	return [];
}

// Pull every meaningful message out of a backend error payload, labelling
// field-specific errors (e.g. DRF: { email: ["Already in use."] } → "Email: Already in use.").
function collectMessages(data: Record<string, unknown>): string[] {
	const messages: string[] = [];
	const seen = new Set<string>();
	const push = (raw: string) => {
		const text = raw.trim();
		if (text && !seen.has(text)) {
			seen.add(text);
			messages.push(text);
		}
	};

	// Specific field-level / validation errors FIRST — these are the real,
	// actionable reasons (e.g. "Password: This field is required."). They take
	// priority over a generic envelope like { message: "Invalid input" }.
	for (const [key, value] of Object.entries(data)) {
		if (key === "detail" || key === "message" || key === "error") continue;
		const label = humanizeField(key);
		for (const message of leafMessages(value)) {
			push(label ? `${label}: ${message}` : message);
		}
	}

	// Then the general/top-level messages as a backstop.
	for (const key of ["detail", "message", "error"] as const) {
		const value = data[key];
		if (typeof value === "string") push(value);
	}

	return messages;
}

// Human-readable fallback derived from the HTTP status code, used only when the
// body carried no usable message.
function statusFallback(status?: number): string | null {
	switch (status) {
		case 400:
			return "The request was invalid. Please check your input and try again.";
		case 401:
			return "You're not signed in, or your session expired. Please log in again.";
		case 403:
			return "You don't have permission to do that.";
		case 404:
			return "We couldn't find what you were looking for.";
		case 408:
			return "The request timed out. Please try again.";
		case 409:
			return "That conflicts with existing data.";
		case 413:
			return "That file or request is too large.";
		case 422:
			return "Some of the information provided couldn't be processed.";
		case 429:
			return "Too many attempts. Please wait a moment and try again.";
		default:
			if (status && status >= 500) {
				return "The server ran into a problem. Please try again in a moment.";
			}
			return null;
	}
}

interface AxiosLikeError {
	code?: unknown;
	message?: unknown;
	response?: { data?: unknown; status?: number };
	data?: unknown;
}

function extractMessage(source: ToastSource, fallback: string): string {
	if (source == null) return fallback;
	if (typeof source === "string") return source.trim() ? truncate(source) : fallback;

	const err = source as AxiosLikeError;
	const code = typeof err.code === "string" ? err.code : undefined;
	const status = err.response?.status;
	const hasResponse = err.response != null;

	// 1) Network-level failures (request never reached / got a response).
	if (!hasResponse) {
		if (code === "ERR_NETWORK") {
			return "Can't reach the server. Check your internet connection and try again.";
		}
		if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
			return "The request timed out. Please try again.";
		}
	}

	// 2) The payload that actually holds the reason. `source` may be the axios
	//    error, OR the already-unwrapped response body (client.ts passes both).
	const data =
		err.response?.data ??
		err.data ??
		(typeof source === "object" && !(source instanceof Error) ? source : undefined);

	if (typeof data === "string" && data.trim() && !looksLikeHtml(data)) {
		return truncate(data);
	}

	if (data && typeof data === "object") {
		const messages = collectMessages(data as Record<string, unknown>);
		if (messages.length) return truncate(messages.slice(0, 3).join("  •  "));
	}

	// 3) A thrown Error's own message — but ignore axios's generic
	//    "Request failed with status code 500", which tells the user nothing.
	if (typeof err.message === "string") {
		const raw = err.message.trim();
		if (raw && !/^request failed with status code/i.test(raw)) {
			return truncate(raw);
		}
	}

	// 4) Last resort: explain what the status code means.
	return statusFallback(status) ?? fallback;
}

// Glass toast card. Swipe it UP (touch or pointer drag) to dismiss — the card
// follows your finger and, once dragged past the threshold or flicked, is
// removed. Tapping the X also dismisses it.
function ToastCard({
	t,
	variant,
	message,
}: {
	t: Toast;
	variant: "success" | "error";
	message: string;
}) {
	const [dragY, setDragY] = useState(0);
	// `isDragging` drives the render (transition on/off); the ref keeps the
	// handlers correct without reading a ref during render (React forbids that).
	const [isDragging, setIsDragging] = useState(false);
	const startY = useRef<number | null>(null);
	const dragging = useRef(false);

	const DISMISS_AT = 60; // px dragged up before release dismisses

	const onPointerDown = (e: React.PointerEvent) => {
		startY.current = e.clientY;
		dragging.current = true;
		setIsDragging(true);
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
	};
	const onPointerMove = (e: React.PointerEvent) => {
		if (!dragging.current || startY.current === null) return;
		// Only track upward movement (negative offset); ignore downward.
		setDragY(Math.min(0, e.clientY - startY.current));
	};
	const endDrag = () => {
		if (!dragging.current) return;
		dragging.current = false;
		setIsDragging(false);
		startY.current = null;
		if (dragY < -DISMISS_AT) toast.remove(t.id);
		else setDragY(0);
	};

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
			<div
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={endDrag}
				onPointerCancel={endDrag}
				style={{
					transform: `translateY(${dragY}px)`,
					opacity: 1 + dragY / 160, // fade as it slides up
					transition: isDragging ? "none" : "transform 0.2s ease, opacity 0.2s ease",
					touchAction: "none",
				}}
				className="pointer-events-auto relative w-full max-w-md cursor-grab touch-none select-none overflow-hidden rounded-[28px] bg-white/35 px-5 py-4 text-slate-900 shadow-[0_30px_90px_rgba(15,23,42,0.28)] backdrop-blur-2xl active:cursor-grabbing"
			>
				<div className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-slate-400/40" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),rgba(255,255,255,0.28)_40%,rgba(248,113,113,0.16)_100%)]" style={{ border: "1px solid rgba(255,255,255,0.5)", borderRadius: "28px" }} />
				<div className="relative flex items-start gap-4 pr-10 pt-1">
					<div
						className={
							variant === "success"
								? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700"
								: "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-700"
						}
					>
						{variant === "success" ? (
							<CheckCircle2 className="h-5 w-5" />
						) : (
							<AlertCircle className="h-5 w-5" />
						)}
					</div>

					<div className="min-w-0 flex-1">
						<p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
							{variant === "success" ? "Success" : "Error"}
						</p>
						<p className="mt-1 break-words text-sm leading-6 text-slate-800">
							{message}
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); toast.remove(t.id); }}
					style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}
					className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-slate-600 transition hover:bg-white hover:text-slate-900"
					aria-label="Dismiss toast"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}

function showToast(
	variant: "success" | "error",
	source: ToastSource,
	fallback: string,
): void {
	const message = extractMessage(source, fallback);
	const id = `${variant}:${message}`;

	toast.custom(
		(t) => <ToastCard t={t} variant={variant} message={message} />,
		{
			id,
			duration: variant === "success" ? 3200 : 5200,
			style: {
				background: "transparent",
				boxShadow: "none",
				padding: 0,
			},
		},
	);
}

export const extractErrorMessage = (
	source: ToastSource,
	fallback = "Something went wrong. Please try again.",
): string => extractMessage(source, fallback);

export const showSuccess = (msg: string): void => {
	showToast("success", msg, msg);
};

// Bumped on every showUndo() call so the countdown remounts (and restarts at
// full duration) even though all undo toasts share one id.
let undoSeq = 0;

/**
 * Undo snackbar with three controls (the "undo phase"):
 *   1. Undo button   → runs `onUndo` (restore) and dismisses.
 *   2. Live countdown → ticks down each second; when it (and the toast's own
 *      duration) reach 0 the caller's timer commits the deletion.
 *   3. ✕ button      → runs `onDeleteNow` (commit immediately) and dismisses.
 * A single shared id keeps only the most recent undo visible (no stacking).
 */
function UndoToast({
	t,
	msg,
	seconds,
	onUndo,
	onDeleteNow,
}: {
	t: Toast;
	msg: string;
	seconds: number;
	onUndo: () => void;
	onDeleteNow: () => void;
}) {
	const [left, setLeft] = useState(seconds);

	useEffect(() => {
		const iv = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
		return () => clearInterval(iv);
	}, []);

	return (
		<div className="fixed inset-x-0 bottom-6 z-[9999] flex justify-center px-4 pointer-events-none">
			<div className="pointer-events-auto relative flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl bg-white/40 px-4 py-3 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur-2xl" style={{ border: "1px solid rgba(255,255,255,0.5)" }}>
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),rgba(255,255,255,0.25)_45%,rgba(148,163,184,0.14)_100%)]" />

				{/* (2) Live countdown badge */}
				<div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-500/15 text-slate-700">
					<span className="text-sm font-bold tabular-nums">{left}</span>
				</div>

				<p className="relative min-w-0 flex-1 break-words text-sm leading-5 text-slate-800">
					{msg}
					<span className="block text-xs text-slate-500">Deleting in {left}s</span>
				</p>

				{/* (1) Undo → restore */}
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onUndo();
						toast.remove(t.id);
					}}
					className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-sm font-semibold text-[#7A2432] transition hover:bg-white"
				>
					<RotateCcw className="h-3.5 w-3.5" />
					Undo
				</button>

				{/* (3) ✕ → delete instantly */}
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onDeleteNow();
						toast.remove(t.id);
					}}
					className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-slate-600 transition hover:bg-white hover:text-[#7A2432]"
					aria-label="Delete now"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}

export const showUndo = (
	msg: string,
	opts: { onUndo: () => void; onDeleteNow: () => void; durationMs?: number },
): void => {
	const duration = opts.durationMs ?? 5000;
	undoSeq += 1;
	const seq = undoSeq;
	toast.custom(
		(t) => (
			<UndoToast
				key={seq}
				t={t}
				msg={msg}
				seconds={Math.round(duration / 1000)}
				onUndo={opts.onUndo}
				onDeleteNow={opts.onDeleteNow}
			/>
		),
		{
			id: "undo-toast",
			duration,
			style: { background: "transparent", boxShadow: "none", padding: 0 },
		},
	);
};

export const showError = (
	source: ToastSource,
	fallback = "Something went wrong. Please try again.",
): void => {
	// In development, log the raw error so the exact backend payload shape is
	// visible — helps diagnose any case where the toast can't find a message.
	if (process.env.NODE_ENV !== "production" && typeof source === "object" && source !== null) {
		const err = source as { response?: { status?: number; data?: unknown } };
		console.groupCollapsed(`[toast] error → "${extractMessage(source, fallback)}"`);
		console.log("status:", err.response?.status);
		console.log("response.data:", err.response?.data ?? source);
		console.groupEnd();
	}
	showToast("error", source, fallback);
};