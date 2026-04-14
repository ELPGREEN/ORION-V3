/**
 * Jules Session Poller — Background polling for pending sessions.
 * Checks DB for pending/running sessions and polls Jules API for updates.
 */

import { getPendingJulesSessions, updateJulesSessionStatus, julesClient } from "./jules-client";

const POLL_INTERVAL_MS = 30_000;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isPolling = false;

async function pollOnce(): Promise<void> {
  if (isPolling) return;
  isPolling = true;

  try {
    const pending = await getPendingJulesSessions();
    if (pending.length === 0) return;

    for (const session of pending) {
      try {
        const result = await julesClient.getSession(session.session_id);
        if (!result.success) continue;

        const apiSession = result.data;
        const pr = apiSession?.outputs?.find((o) => o.pullRequest);

        if (pr?.pullRequest) {
          await updateJulesSessionStatus(session.session_id, {
            status: "completed",
            pr_url: pr.pullRequest.url,
            pr_title: pr.pullRequest.title,
            completed_at: new Date().toISOString(),
          });

          // Dispatch custom event for UI notification
          window.dispatchEvent(
            new CustomEvent("jules:pr-ready", {
              detail: {
                sessionId: session.session_id,
                prUrl: pr.pullRequest.url,
                prTitle: pr.pullRequest.title,
                subsystem: session.subsystem,
              },
            }),
          );

          console.log(`[Jules-Poller] PR ready for ${session.session_id}: ${pr.pullRequest.url}`);
        } else if (session.status === "pending") {
          // Mark as running if API confirms activity
          await updateJulesSessionStatus(session.session_id, { status: "running" });
        }
      } catch (err) {
        console.warn(`[Jules-Poller] Error polling ${session.session_id}:`, err);
      }
    }
  } catch (err) {
    console.warn("[Jules-Poller] Poll cycle error:", err);
  } finally {
    isPolling = false;
  }
}

export function startJulesPolling(): void {
  if (pollTimer) return;
  console.log("[Jules-Poller] Starting background polling (30s interval)");
  pollOnce();
  pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
}

export function stopJulesPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log("[Jules-Poller] Stopped");
  }
}

export function isJulesPollingActive(): boolean {
  return pollTimer !== null;
}
