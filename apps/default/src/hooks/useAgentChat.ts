import { useState, useRef, useCallback, useEffect } from 'react';
import { useAgentChat as useSDKAgentChat, createConversation } from '@/lib/agent-chat';
import type { ChatMessage } from '../types/osint';
import { useConnectionHealth } from './useConnectionHealth';

// ─── Progressive stage detection ─────────────────────────────────────────────
export type StreamStage =
  | { type: 'idle' }
  | { type: 'parsing'; text: string }
  | { type: 'queuing'; targets: string[] }
  | { type: 'searching'; query: string }
  | { type: 'storing' }
  | { type: 'done'; summary: string };

function detectStage(content: string): StreamStage {
  const lower = content.toLowerCase();
  if (!content.trim()) return { type: 'idle' };
  if (lower.includes('searching') || lower.includes('web search') || lower.includes('looking up'))
    return { type: 'searching', query: content.split('\n')[0].slice(0, 60) };
  if (lower.includes('queuing') || lower.includes('queued') || lower.includes('job created') || lower.includes('added to queue'))
    return { type: 'queuing', targets: [] };
  if (lower.includes('storing') || lower.includes('saved') || lower.includes('source stored'))
    return { type: 'storing' };
  if (lower.includes('parsing') || lower.includes('extracting') || lower.includes('identified'))
    return { type: 'parsing', text: content.slice(0, 80) };
  return { type: 'idle' };
}

interface UseAgentChatOptions {
  agentId: string;
  onTargetCreated?: () => void;
}

// How long (ms) to wait after a user message before giving up on an agent reply
// and unblocking the input. Prevents isSending getting permanently stuck.
const SEND_TIMEOUT_MS = 60_000;

export function useAgentChat({ agentId, onTargetCreated }: UseAgentChatOptions) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [stage, setStage] = useState<StreamStage>({ type: 'idle' });

  // Tracks whether we are waiting for an agent reply after a user message.
  // This is separate from isStreaming so we can time it out.
  const [pendingReply, setPendingReply] = useState(false);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset initialized on unmount so re-mounting the component
  // (e.g. switching views and back) does not leave the hook permanently locked.
  const initialized = useRef(false);
  useEffect(() => {
    return () => {
      initialized.current = false;
    };
  }, []);

  const prevCompleteCount = useRef(0);

  const {
    sendMessage: sdkSend,
    messages: sdkMessages,
    isConnected,
    error: sdkError,
  } = useSDKAgentChat(agentId, conversationId);

  // ── Core initialize ────────────────────────────────────────────────────────
  // Exposed both for the initial mount AND for the health-check auto-retry.
  // The health check calls this when the stream has been down for 30 s.
  const initialize = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;
    setIsLoading(true);
    setInitError(null);
    try {
      const { conversationId: newId } = await createConversation(agentId);
      setConversationId(newId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect';
      setInitError(msg.includes('Failed') ? 'Connection failed. Tap to retry.' : msg);
      // Reset flag on error so the user (or health check) can retry
      initialized.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  // ── Connection health check ────────────────────────────────────────────────
  // conversationId being non-null is the reliable indicator that initialize()
  // has successfully completed at least once, which is what the health check
  // needs to know before it's safe to call initialize() for auto-retry.
  const health = useConnectionHealth(
    isConnected,
    initialize,
    conversationId !== null,
  );

  // Detect stage from the latest streaming assistant message
  useEffect(() => {
    const streaming = sdkMessages.find(m => m.role === 'assistant' && !m.isComplete);
    if (streaming) {
      setStage(detectStage(streaming.content));
    } else {
      setStage({ type: 'idle' });
    }
  }, [sdkMessages]);

  // Convert SDK MessageState → ChatMessage
  const messages: ChatMessage[] = sdkMessages.map(m => ({
    id: m.id,
    role: m.role === 'assistant' ? 'agent' : 'user',
    content: m.content,
    timestamp: new Date(),
    isStreaming: !m.isComplete,
  }));

  const isStreaming = sdkMessages.some(m => m.role === 'assistant' && !m.isComplete);

  // Clear pendingReply (and cancel the timeout) as soon as the
  // agent starts streaming, finishes, or an error arrives.
  useEffect(() => {
    if (isStreaming || sdkError) {
      setPendingReply(false);
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }
    }
  }, [isStreaming, sdkError]);

  // Notify on completed agent turns
  const completeAgentMsgs = sdkMessages.filter(m => m.role === 'assistant' && m.isComplete).length;
  if (completeAgentMsgs > prevCompleteCount.current) {
    prevCompleteCount.current = completeAgentMsgs;
    if (onTargetCreated && completeAgentMsgs > 0) {
      setTimeout(() => onTargetCreated(), 2000);
    }
  }

  // isSending is true while the agent is actively streaming OR while we are
  // waiting for the first token (pendingReply). It cannot get permanently stuck.
  const isSending = isStreaming || pendingReply;

  const sendMessage = useCallback(async (text: string) => {
    if (!conversationId) return;
    setStage({ type: 'parsing', text: text.slice(0, 60) });

    // Mark as pending so the UI shows a spinner immediately
    setPendingReply(true);

    // Safety timeout — if no agent response arrives within SEND_TIMEOUT_MS,
    // clear the pending flag so the input unblocks.
    if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
    sendTimeoutRef.current = setTimeout(() => {
      setPendingReply(false);
      sendTimeoutRef.current = null;
    }, SEND_TIMEOUT_MS);

    try {
      await sdkSend(text);
    } catch {
      // If the send itself fails, unblock immediately
      setPendingReply(false);
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }
    }
  }, [conversationId, sdkSend]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
    };
  }, []);

  const error = initError ?? (sdkError ? 'Connection error.' : null);

  return {
    messages,
    isConnected,
    isLoading,
    isSending,
    isStreaming,
    stage,
    error,
    initialize,
    sendMessage,
    // Health check exports
    healthStatus: health.status,
    secondsDisconnected: health.secondsDisconnected,
    secondsUntilRetry: health.secondsUntilRetry,
    retryCount: health.retryCount,
    retryNow: health.retryNow,
  };
}
