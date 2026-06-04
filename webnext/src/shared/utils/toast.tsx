"use client";

import { toast } from "react-hot-toast";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

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

	// General messages first.
	for (const key of ["detail", "message", "error"] as const) {
		const value = data[key];
		if (typeof value === "string") push(value);
	}

	// Then field-level / nested errors, prefixed with a readable field label.
	for (const [key, value] of Object.entries(data)) {
		if (key === "detail" || key === "message" || key === "error") continue;
		const label = humanizeField(key);
		for (const message of leafMessages(value)) {
			push(label ? `${label}: ${message}` : message);
		}
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

function showToast(
	variant: "success" | "error",
	source: ToastSource,
	fallback: string,
): void {
	const message = extractMessage(source, fallback);
	const id = `${variant}:${message}`;

	toast.custom(
		(t) => (
			<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
				<div className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/50 bg-white/35 px-5 py-4 text-slate-900 shadow-[0_30px_90px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),rgba(255,255,255,0.28)_40%,rgba(248,113,113,0.16)_100%)]" />
					<div className="relative flex items-start gap-4">
						<div
							className={
								variant === "success"
									? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20"
									: "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/20"
							}
						>
							{variant === "success" ? (
								<CheckCircle2 className="h-5 w-5" />
							) : (
								<AlertCircle className="h-5 w-5" />
							)}
						</div>

						<div className="min-w-0 flex-1 pr-10">
							<p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
								{variant === "success" ? "Success" : "Error"}
							</p>
							<p className="mt-1 break-words text-sm leading-6 text-slate-800">
								{message}
							</p>
						</div>

						<button
							type="button"
							onClick={() => toast.dismiss(t.id)}
							className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white/70 text-red-600 transition hover:bg-red-50 hover:text-red-700"
							aria-label="Dismiss toast"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				</div>
			</div>
		),
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

export const showError = (
	source: ToastSource,
	fallback = "Something went wrong. Please try again.",
): void => {
	showToast("error", source, fallback);
};