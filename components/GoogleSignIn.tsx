"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { useState, useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

export function GoogleSignIn() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = async (response: any) => {
    try {
      setLoading(true);
      setError("");

      const apiResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/google-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: response.credential }),
        },
      );

      if (!apiResponse.ok) throw new Error("Failed to sign in");

      const data = await apiResponse.json();

      if (data.token && data.user) {
        login(data.token, data.user);
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      setError("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const initializeGoogle = () => {
    if (!window.google || !clientId || !buttonRef.current) return;

    window.google.accounts.id.cancel();

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
    });

    const containerWidth = buttonRef.current.offsetWidth;
    const buttonWidth = Math.min(Math.max(containerWidth, 200), 400);

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: buttonWidth,
      text: "signin_with",
      shape: "rectangular",
    });
  };

  useEffect(() => {
    if (!clientId) return;

    if (window.google) {
      initializeGoogle();
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogle);
      return () => existingScript.removeEventListener("load", initializeGoogle);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.body.appendChild(script);
  }, [clientId]);

  useEffect(() => {
    const handleResize = () => {
      if (window.google && clientId) {
        initializeGoogle();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clientId]);

  if (!clientId) {
    return (
      <div className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950 p-2 rounded">
        Google Sign-In not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to
        .env.local
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded text-center">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-muted-foreground text-center">
          Signing in...
        </div>
      )}
      <div
        ref={buttonRef}
        className="flex justify-center w-full overflow-hidden"
      />
    </div>
  );
}
