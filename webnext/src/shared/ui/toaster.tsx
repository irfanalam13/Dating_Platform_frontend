"use client";

import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { showError } from "@/shared/utils/toast";

export default function AppToaster() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      showError(
        event.error ?? event.message,
        event.message || "An unexpected error occurred.",
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      showError(event.reason, "A request failed unexpectedly.");
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <Toaster
      position="top-center"
      gutter={16}
      reverseOrder={false}
      containerStyle={{
        zIndex: 9999,
      }}
      toastOptions={{
        duration: 5000,
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
        },
      }}
    />
  );
}