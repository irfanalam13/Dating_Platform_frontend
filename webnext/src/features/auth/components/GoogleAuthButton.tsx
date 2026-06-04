"use client";

import { useEffect, useRef, useState } from "react";
import { showError } from "@/shared/utils/toast";
import { useGoogleAuth } from "../hooks/useAuth";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type GoogleButtonText = "signin_with" | "signup_with" | "continue_with" | "signin";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "large" | "medium" | "small";
          shape?: "pill" | "rectangular" | "circle" | "square";
          text?: GoogleButtonText;
          width?: number;
        }
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_SCRIPT_SRC}"]`
      );

      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

type GoogleAuthButtonProps = {
  text?: GoogleButtonText;
};

export default function GoogleAuthButton({ text = "continue_with" }: GoogleAuthButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const buttonRef = useRef<HTMLDivElement>(null);
  const { mutate, isPending } = useGoogleAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    let active = true;

    loadGoogleScript()
      .then(() => {
        if (!active || !window.google?.accounts?.id || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response) => {
            if (!response.credential) {
              showError("Google did not return a sign-in token.");
              return;
            }

            mutate({ id_token: response.credential });
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text,
          width: Math.min(buttonRef.current.offsetWidth || 360, 400),
        });
        setReady(true);
      })
      .catch(() => {
        if (active) showError("Could not load Google sign-in.");
      });

    return () => {
      active = false;
    };
  }, [clientId, mutate, text]);

  if (!clientId) {
    return (
      <button
        type="button"
        onClick={() => showError("Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in.")}
        className="w-full min-h-11 rounded-full border border-black/15 bg-white text-black font-medium flex items-center justify-center gap-3 hover:bg-black/5 transition"
      >
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full border border-black/20 text-sm font-semibold"
        >
          G
        </span>
        Continue with Google
      </button>
    );
  }

  return (
    <div
      className={`flex min-h-11 w-full justify-center ${isPending ? "pointer-events-none opacity-60" : ""}`}
      aria-busy={isPending}
    >
      <div ref={buttonRef} className={ready ? "w-full" : "min-h-11 w-full"} />
    </div>
  );
}
