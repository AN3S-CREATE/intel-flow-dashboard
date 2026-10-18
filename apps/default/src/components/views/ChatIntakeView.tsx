import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Shield, Wifi, WifiOff, Zap, Search,
  Loader2, CheckCircle2, Database, Globe, ListPlus, RefreshCw,
} from 'lucide-react';
import { useAgentChat } from '../../hooks/useAgentChat';
import type { StreamStage } from '../../hooks/useAgentChat';
import type { HealthStatus } from '../../hooks/useConnectionHealth';
import { FindingsFeed } from '../FindingsFeed';
import type { LiveFinding } from '../../hooks/useLiveFindings';
import { cn } from '../../lib/utils';

// ─── Connection health pill ───────────────────────────────────────────────────
// Shows live status: green connected, amber reconnecting with spinner,
// red disconnected with a countdown arc and a manual retry button.
function HealthPill({
  status,
  secondsDisconnected,
  secondsUntilRetry,
  retryCount,
  onRetry,
  onInitialize,
}: {
  status: HealthStatus;
  secondsDisconnected: number;
  secondsUntilRetry: number;
  retryCount: number;
  onRetry: () => void;
  onInitialize: () => void;
}) {
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/8 border-emerald-500/20">
        <Wifi size={10} />
        Live
      </div>
    );
  }

  if (status === 'reconnecting') {
    return (
      <motion.div
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border text-amber-400 bg-amber-500/8 border-amber-500/20"
      >
        <Loader2 size={10} className="animate-spin" />
        Reconnecting…
      </motion.div>
    );
  }

  // status === 'disconnected'
  const isFirstConnect = retryCount === 0 && secondsDisconnected < 5;
  return (
    <div className="flex items-center gap-1.5">
      {/* Countdown label — only show after first 5 s to avoid initial flicker */}
      {!isFirstConnect && (
        <motion.span
          key={secondsUntilRetry}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[9px] text-muted-foreground tabular-nums"
        >
          retry in {secondsUntilRetry}s
        </motion.span>
      )}
      <button
        onClick={retryCount === 0 ? onInitialize : onRetry}
        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border text-red-400 bg-red-500/5 border-red-500/20 hover:bg-red-500/10 transition-all cursor-pointer"
        title="Reconnect now"
      >
        {isFirstConnect ? (
          <>
            <Loader2 size={10} className="animate-spin" />
            Connecting…
          </>
        ) : (
          <>
            <RefreshCw size={10} />
            Reconnect
          </>
        )}
      </button>
    </div>
  );
}

// Intake Agent id — from AGENTS[0] in types/osint.ts
const INTAKE_AGENT_ID = '01KJRSATB7148SQTVSERZKEKV3';

// ─── Progressive stage indicator ─────────────────────────────────────────────
const STAGE_CONFIG: Record<StreamStage['type'], { icon: React.ElementType; label: string; color: string }> = {
  idle:     { icon: CheckCircle2, label: 'Ready',     color: 'text-muted-foreground' },
  parsing:  { icon: Search,      label: 'Parsing…',   color: 'text-sky-400' },
  queuing:  { icon: ListPlus,    label: 'Queuing…',   color: 'text-amber-400' },
  searching:{ icon: Globe,       label: 'Searching…', color: 'text-purple-400' },
  storing:  { icon: Database,    label: 'Storing…',   color: 'text-emerald-400' },
  done:     { icon: CheckCircle2,label: 'Done',       color: 'text-emerald-400' },
};

function StageIndicator({ stage, isStreaming }: { stage: StreamStage; isStreaming: boolean }) {
  const cfg = STAGE_CONFIG[stage.type];
  const Icon = cfg.icon;
  const isActive = isStreaming && stage.type !== 'idle';

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={stage.type}
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.18 }}
          className="mx-6 mb-2"
        >
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs',
            stage.type === 'searching' ? 'bg-purple-500/5 border-purple-500/20' :
            stage.type === 'queuing'   ? 'bg-amber-500/5 border-amber-500/20' :
            stage.type === 'storing'   ? 'bg-emerald-500/5 border-emerald-500/20' :
                                         'bg-sky-500/5 border-sky-500/20'
          )}>
            <Loader2 size={11} className={cn('animate-spin shrink-0', cfg.color)} />
            <span className={cfg.color}>{cfg.label}</span>
            {'text' in stage && stage.text && (
              <span className="text-muted-foreground truncate max-w-[200px]">{stage.text}</span>
            )}
            {'query' in stage && stage.query && (
              <span className="text-muted-foreground truncate max-w-[200px]">"{stage.query}"</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Intake chip shortcuts ────────────────────────────────────────────────────
const CHIPS = [
  { label: '+ Company', cmd: 'Add: ', icon: Search },
  { label: '+ Person',  cmd: 'Add: ',  icon: Search },
  { label: 'Queue',     cmd: 'Show queue', icon: Zap },
  { label: 'Run now',   cmd: 'Run now: ',  icon: Zap },
];

// ─── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ role, content, isStreaming }: {
  role: 'user' | 'agent';
  content: string;
  isStreaming?: boolean;
}) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {!isUser && (
        <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-xs shrink-0 mt-0.5">
          🎯
        </div>
      )}
      <div className={cn(
        'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-primary/10 border border-primary/20 text-foreground rounded-tr-sm'
          : 'glass-card rounded-tl-sm'
      )}>
        {/* Render token by token — markdown parsed on full content only when done */}
        {isStreaming ? (
          <p className={cn('whitespace-pre-wrap text-foreground/90 typing-cursor')}>{content || '\u200b'}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────
interface ChatIntakeViewProps {
  findings: LiveFinding[];
  isPolling: boolean;
  totalCount: number;
  fetchError?: string | null;
  refresh: () => void;
}

export function ChatIntakeView({ findings = [], isPolling, totalCount, fetchError, refresh }: ChatIntakeViewProps) {
  const {
    messages, isConnected, isSending, isStreaming,
    stage, error, initialize, sendMessage,
    healthStatus, secondsDisconnected, secondsUntilRetry, retryCount, retryNow,
  } = useAgentChat({ agentId: INTAKE_AGENT_ID });

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const didInit = useRef(false);

  // Init immediately on mount — no greeting, just connect silently
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      initialize();
    }
  }, [initialize]);

  // Auto-scroll only when streaming to follow output live
  useEffect(() => {
    if (isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
    sendMessage(text);
    refresh(); // nudge the findings feed to poll sooner
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = !!input.trim() && !isSending && isConnected;

  return (
    <div className="flex h-full min-h-0">
    {/* ── Chat column ── */}
    <div className="flex flex-col flex-1 min-w-0 h-full">

      {/* ── Compact header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-sm">🎯</div>
          <div>
            <p className="text-xs font-semibold text-foreground">OSINT Intake</p>
            <p className="text-[10px] text-muted-foreground">Add targets · run jobs · export reports</p>
          </div>
        </div>
        <HealthPill
          status={healthStatus}
          secondsDisconnected={secondsDisconnected}
          secondsUntilRetry={secondsUntilRetry}
          retryCount={retryCount}
          onRetry={retryNow}
          onInitialize={initialize}
        />
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">

        {/* Empty state — no greeting wall, just a quiet prompt */}
        {messages.length === 0 && !isSending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full pb-16 text-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">🎯</div>
            <div>
              <p className="text-sm font-medium text-foreground">What do you want to investigate?</p>
              <p className="text-xs text-muted-foreground mt-1">Type a name, company, or command below</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {[
                'Add: [Name] | type=company | jurisdiction=UK',
                'Add: [Name] | type=person | jurisdiction=US',
                'Show queue',
              ].map(ex => (
                <button
                  key={ex}
                  onClick={() => { setInput(ex); textareaRef.current?.focus(); }}
                  className="text-left text-xs px-3 py-2 rounded-xl glass border border-border hover:border-primary/30 hover:text-primary transition-all font-mono"
                >
                  {ex}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <MessageBubble
                role={msg.role}
                content={msg.content}
                isStreaming={msg.isStreaming}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing dot — agent accepted but hasn't emitted a token yet */}
        {isSending && !isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2.5"
          >
            <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-xs">🎯</div>
            <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {(error || healthStatus === 'disconnected') && !isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 4, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mx-2"
            >
              <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex items-start gap-2.5">
                <WifiOff size={13} className="text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-red-400 font-medium">
                    {healthStatus === 'reconnecting' ? 'Reconnecting…' : 'Connection lost'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {healthStatus === 'reconnecting'
                      ? 'Attempting to restore the stream automatically.'
                      : retryCount > 0
                        ? `Auto-retry in ${secondsUntilRetry}s · ${retryCount} attempt${retryCount > 1 ? 's' : ''} so far.`
                        : 'Could not reach the intake agent. Will retry automatically.'}
                  </p>
                </div>
                <button
                  onClick={retryCount === 0 ? initialize : retryNow}
                  disabled={healthStatus === 'reconnecting'}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all shrink-0 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                >
                  {healthStatus === 'reconnecting'
                    ? <><Loader2 size={10} className="animate-spin" /> Retrying</>
                    : <><RefreshCw size={10} /> Retry now</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ── Progressive stage bar ── */}
      <StageIndicator stage={stage} isStreaming={isStreaming} />

      {/* ── Input ── */}
      <div className="px-5 pb-5 pt-2 border-t border-border shrink-0">
        {/* Quick chips */}
        <div className="flex gap-1.5 mb-2.5 flex-wrap">
          {CHIPS.map(c => (
            <button
              key={c.label}
              onClick={() => { setInput(c.cmd); textareaRef.current?.focus(); }}
              className="text-[11px] px-2.5 py-1 rounded-lg glass border border-border hover:border-primary/30 hover:text-primary transition-all"
            >
              {c.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <Shield size={9} />
            Public sources only
          </div>
        </div>

        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Add: Name | type=company | jurisdiction=US'
            rows={1}
            className="flex-1 resize-none bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
            style={{ minHeight: '44px', maxHeight: '96px' }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 96) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 shrink-0',
              canSend
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 glow-primary'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
            )}
          >
            {isSending
              ? <Loader2 size={14} className="animate-spin" />
              : <Send size={14} />
            }
          </button>
        </div>
      </div>

    </div>{/* end chat column */}

    {/* ── Live Findings Feed ── */}
    <FindingsFeed
      findings={findings}
      isPolling={isPolling}
      totalCount={totalCount}
      fetchError={fetchError}
      onRetry={refresh}
    />

    </div> /* end outer flex row */
  );
}
