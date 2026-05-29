"use client";

import { toast } from "react-hot-toast";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type ToastSource = string | Error | unknown;

function extractMessage(source: ToastSource, fallback: string): string {
	if (typeof source === "string") return source;

	if (source instanceof Error) {
		return source.message || fallback;
	}

	if (source && typeof source === "object") {
		const errorLike = source as {
			message?: unknown;
			response?: { data?: unknown };
			data?: unknown;
		};

		if (typeof errorLike.message === "string" && errorLike.message.trim()) {
			return errorLike.message;
		}

		const responseData = errorLike.response?.data ?? errorLike.data;
		if (responseData && typeof responseData === "object") {
			const data = responseData as Record<string, unknown>;
			const fieldErrors = (data.data ?? data.errors) as
				| Record<string, unknown>
				| undefined;

			if (fieldErrors && typeof fieldErrors === "object") {
				const firstError = Object.values(fieldErrors)
					.flat()
					.find((message) => typeof message === "string" && message.trim());

				if (typeof firstError === "string") {
					return firstError;
				}
			}

			const candidates = [data.detail, data.message, data.error];
			for (const candidate of candidates) {
				if (typeof candidate === "string" && candidate.trim()) {
					return candidate;
				}
			}
		}
	}

	return fallback;
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