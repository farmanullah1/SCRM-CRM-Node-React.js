import React, { useEffect, useRef, useState } from "react";

const SCRIPT_ID = "google-identity-services";

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Google sign-in could not load.")), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google sign-in could not load."));
    document.head.appendChild(script);
  });
}

export default function GoogleSignInButton({ onCredential, disabled = false, mode = "signin" }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const [unavailable, setUnavailable] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    let cancelled = false;
    if (!clientId) {
      setUnavailable(true);
      return undefined;
    }

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) callbackRef.current?.(response.credential);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: "popup"
        });
        containerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          shape: "rectangular",
          text: mode === "signup" ? "signup_with" : "continue_with",
          logo_alignment: "left",
          width: 360
        });
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, mode]);

  if (unavailable) return null;

  return (
    <div className="google-signin-wrap" aria-busy={disabled}>
      <div ref={containerRef} className={disabled ? "is-disabled" : ""} />
    </div>
  );
}
