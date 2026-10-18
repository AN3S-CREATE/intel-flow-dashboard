import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
/** How often (ms) we poll isConnected to detect drops */
const HEALTH_CHECK_INTERVAL_MS = 5_000;

/** After this many ms disconnected, fire an auto-retry */
const AUTO_RETRY_AFTER_MS = 30_000;

/** Minimum ms between auto-retry attempts (prevents rapid hammering) */
const MIN_RETRY_COOLDOWN_MS = 10_000;

// ─── Types ────────────────────────────────────────────────────────────────────
export type HealthStatus =
  | 'connected'      // stream is open
  | 'reconnecting'   // auto-retry is in progress (initialize() was just called)
  | 'disconnected';  // stream is down, counting toward auto-retry

export interface ConnectionHealth {
  /** Overall connection status */
  status: HealthStatus;
  /** Seconds the stream has been disconnected (0 when connected) */
  secondsDisconnected: number;
  /** Seconds remaining until next auto-retry (only meaningful when 'disconnected') */
  secondsUntilRetry: number;
  /** How many auto-retries have been attempted this session */
  retryCount: number;
  /** Manually trigger a reconnect immediately */
  retryNow: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Monitors an SSE agent stream and automatically retries after 30 s disconnected.
 *
 * @param isConnected  - live boolean from the SDK hook
 * @param initialize   - the async function that creates a conversation + opens the stream
 * @param isInitialized - whether a conversation has already been created
 */
export function useConnectionHealth(
  isConnected: boolean,
  initialize: () => Promise<void>,
  isInitialized: boolean,
): ConnectionHealth {
  const [status, setStatus] = useState<HealthStatus>('disconnected');
  const [secondsDisconnected, setSecondsDisconnected] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // When did we first notice the disconnect?
  const disconnectedAtRef = useRef<number | null>(null);
  // When did we last fire a retry? (throttle guard)
  const lastRetryAtRef = useRef<number>(0);
  // Is a retry call currently in-flight?
  const isRetryingRef = useRef(false);
  // Tick counter ref so the interval closure always sees fresh values via the ref
  const isConnectedRef = useRef(isConnected);
  const isInitializedRef = useRef(isInitialized);

  // Keep refs in sync with props on every render
  useEffect(() => { isConnectedRef.current = isConnected; }, [isConnected]);
  useEffect(() => { isInitializedRef.current = isInitialized; }, [isInitialized]);

  // Transition to 'connected' immediately when the stream opens
  useEffect(() => {
    if (isConnected) {
      disconnectedAtRef.current = null;
      isRetryingRef.current = false;
      setStatus('connected');
      setSecondsDisconnected(0);
    }
  }, [isConnected]);

  // ── Retry logic ───────────────────────────────────────────────────────────
  const doRetry = useCallback(async () => {
    const now = Date.now();
    const cooldownOk = now - lastRetryAtRef.current >= MIN_RETRY_COOLDOWN_MS;

    if (isRetryingRef.current || !cooldownOk) return;
    if (isConnectedRef.current) return; // raced — already connected

    // Only retry if a conversation was already initialised; otherwise the
    // initial initialize() call is already pending elsewhere.
    if (!isInitializedRef.current) return;

    isRetryingRef.current = true;
    lastRetryAtRef.current = now;
    setStatus('reconnecting');
    setRetryCount(c => c + 1);

    try {
      await initialize();
    } catch {
      // initialize() sets its own error state; we just unblock the flag
    } finally {
      isRetryingRef.current = false;
      // Status will flip to 'connected' via the isConnected effect above,
      // or stay 'reconnecting' until the next health-check tick flips it back
      // to 'disconnected' if the retry also failed.
    }
  }, [initialize]);

  // ── Periodic health tick ──────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const connected = isConnectedRef.current;

      if (connected) {
        // Already handled by the isConnected effect — nothing to do
        return;
      }

      // Stream is down
      const now = Date.now();

      // Record the first moment we notice a disconnect
      if (disconnectedAtRef.current === null) {
        disconnectedAtRef.current = now;
      }

      const elapsed = now - disconnectedAtRef.current;
      const secs = Math.floor(elapsed / 1000);
      setSecondsDisconnected(secs);

      // Only update status to 'disconnected' if we're not mid-retry
      if (!isRetryingRef.current) {
        setStatus('disconnected');
      }

      // Fire auto-retry once we've been disconnected long enough
      if (elapsed >= AUTO_RETRY_AFTER_MS && !isRetryingRef.current) {
        doRetry();
      }
    };

    const id = setInterval(tick, HEALTH_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [doRetry]);

  // ── retryNow: manual trigger ───────────────────────────────────────────────
  const retryNow = useCallback(() => {
    // Override the cooldown for manual retries by clearing lastRetryAt
    lastRetryAtRef.current = 0;
    doRetry();
  }, [doRetry]);

  // Derived: seconds remaining until auto-retry kicks in
  const secondsUntilRetry = Math.max(
    0,
    Math.ceil((AUTO_RETRY_AFTER_MS - secondsDisconnected * 1000) / 1000),
  );

  return { status, secondsDisconnected, secondsUntilRetry, retryCount, retryNow };
}
