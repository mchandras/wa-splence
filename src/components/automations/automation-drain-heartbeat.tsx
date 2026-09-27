"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

/**
 * AutomationDrainHeartbeat — headless component mounted in DashboardShell.
 * Periodically drains due automation wait steps while any team member
 * has the dashboard open in their browser.
 */
export function AutomationDrainHeartbeat() {
  const { accountId } = useAuth();
  const lastDrainRef = useRef(0);

  useEffect(() => {
    if (!accountId) return;

    const drain = async () => {
      // Coalesce: at most once every 30 seconds
      if (Date.now() - lastDrainRef.current < 30_000) return;
      lastDrainRef.current = Date.now();
      try {
        await fetch("/api/automations/cron", { method: "POST" });
      } catch {
        // Non-blocking
      }
    };

    void drain();
    const interval = setInterval(drain, 45_000);

    return () => clearInterval(interval);
  }, [accountId]);

  return null;
}
