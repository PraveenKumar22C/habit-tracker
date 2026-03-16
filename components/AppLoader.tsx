"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import { PageLoader } from "@/components/Pageloader";

export function AppLoader({ children }: { children: React.ReactNode }) {
  const _hydrated = useAuthStore((s) => s._hydrated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !_hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <PageLoader message="Starting HabitTrack…" />
      </div>
    );
  }

  return <>{children}</>;
}
