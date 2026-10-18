# Connection Health Check — completed

## What was built
- `app/src/hooks/useConnectionHealth.ts` — standalone hook
  - Pings isConnected every 5 s
  - Tracks disconnectedAt timestamp
  - Auto-retries (calls initialize) after 30 s disconnected
  - MIN_RETRY_COOLDOWN_MS = 10 s between auto-retries
  - Exposes: status ('connected'|'reconnecting'|'disconnected'), secondsDisconnected, secondsUntilRetry, retryCount, retryNow()

- `app/src/hooks/useAgentChat.ts` — wired health hook
  - Imports useConnectionHealth, passes isConnected + initialize + (conversationId !== null)
  - Exports all health fields: healthStatus, secondsDisconnected, secondsUntilRetry, retryCount, retryNow

- `app/src/components/views/ChatIntakeView.tsx` — UI updates
  - Added HealthPill component (green/amber/red pill with countdown + spinner)
  - Replaced static button pill with <HealthPill />
  - Replaced static error banner with animated AnimatePresence version
    showing retry count, countdown, reconnecting spinner

## Key design decisions
- isInitialized passed as `conversationId !== null` (not initialized.current ref) to avoid stale closure
- HealthPill shows "Connecting…" on first connect (retryCount===0 && secs<5)
- retryNow() resets lastRetryAtRef to 0 to override cooldown for manual clicks
- Health check only calls initialize() when isInitializedRef is true (conversation exists)
  otherwise the initial mount initialize() is already pending
