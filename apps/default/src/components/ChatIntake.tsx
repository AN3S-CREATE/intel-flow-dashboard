import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Zap, Shield, AlertTriangle, Bot, User,
  Loader2, Wifi, WifiOff, Target, Layers,
  CheckCircle2, ChevronRight, CornerDownLeft
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAgentChat } from '../hooks/useAgentChat';
import { cn } from '../lib/utils';
import { FeedEvent } from './LiveFeed';

const INTAKE_AGENT_ID = '01KJRSATB7148SQTVSERZKEKV3';

const GREETING = `👋 Welcome to **Biz Intel OSINT Runner**.

I'm your **Intake Agent**. I'll help you add targets and queue research jobs.

To add a target, type:
\`\`\`
Add: <Name> | type=person or company | jurisdiction=<Country> | notes=<optional>
\`\`\`

Other commands:
- \`Show queue\` — view pending jobs
- \`Run now: <target>\` — prioritize a target
- \`Pause: <target>\` — pause a target's jobs
- \`Export report: <target>\` — generate a profile

⚠️ **Public sources only.** No personal data collected. All findings label facts vs allegations.`;

const QUICK_COMMANDS = [
  { label: '+ Add Company', icon: '🏢', cmd: 'Add: Nexus Capital Partners | type=company | jurisdiction=United Kingdom | notes=Check regulatory filings, SEC enforcement, and litigation history' },
  { label: '+ Add Person', icon: '👤', cmd: 'Add: Alexandra Chen | type=person | jurisdiction=United States | notes=Public figure, check board roles, regulatory mentions, and media coverage' },
  { label: '📋 Show queue', icon: '📋', cmd: 'Show queue' },
  { label: '❓ Help', icon: '❓', cmd: 'What kinds of targets can you research and what information do you collect?' },
];

interface Props {
  onDataChanged?: () => void;
  onFeedEvent?: (event: FeedEvent) => void;
}

function parseTargetFromMessage(text: string): { name?: string; isAddCmd: boolean } {
  const lower = text.toLowerCase().trim();
  if (!lower.startsWith('add:')) return { isAddCmd: false };
  const parts = text.split('|');
  const namePart = parts[0].replace(/^add:/i, '').trim();
  return { name: namePart || undefined, isAddCmd: true };
}

export default function ChatIntake({ onDataChanged, onFeedEvent }: Props) {
  const [input, setInput] = useState('');
  const [lastUserCmd, setLastUserCmd] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);
  const prevMsgCount = useRef(0);

  const handleTargetCreated = useCallback(() => {
    if (onDataChanged) onDataChanged();
    if (lastUserCmd && onFeedEvent) {
      const { name, isAddCmd } = parseTargetFromMessage(lastUserCmd);
      if (isAddCmd) {
        const ts = Date.now();
        // Fire: target created
        onFeedEvent({
          id: `tgt-${ts}`,
          type: 'target_created',
          title: `Target Created${name ? `: ${name}` : ''}`,
          subtitle: 'Added to OSINT Targets database',
          timestamp: new Date(),
        });
        // Fire: jobs queued (slight delay for cascade feel)
        setTimeout(() => {
          onFeedEvent({
            id: `jobs-${ts}`,
            type: 'job_queued',
            title: '4 Jobs Queued',
            subtitle: 'Discovery · Scrape · Cross-check · Report',
            timestamp: new Date(),
          });
        }, 700);
        // Fire: processing
        setTimeout(() => {
          onFeedEvent({
            id: `proc-${ts}`,
            type: 'processing',
            title: 'Pipeline Running',
            subtitle: 'Scheduled runner will pick up jobs hourly',
            timestamp: new Date(),
          });
        }, 1400);
      }
    }
  }, [lastUserCmd, onDataChanged, onFeedEvent]);

  const { messages, isConnected, isLoading, isSending, error, initialize, sendMessage } = useAgentChat({
    agentId: INTAKE_AGENT_ID,
    onTargetCreated: handleTargetCreated,
  });

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initialize(GREETING);
    }
  }, [initialize]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isSending || isLoading) return;
    setLastUserCmd(text);
    setInput('');
    sendMessage(text);
  }, [input, isSending, isLoading, sendMessage]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuick = (cmd: string) => {
    setInput(cmd);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Detect new messages appearing
  const newMsgCount = messages.length;
  if (newMsgCount > prevMsgCount.current) {
    prevMsgCount.current = newMsgCount;
  }

  const agentIsTyping = isSending && !messages.some(m => m.role === 'agent' && m.isStreaming);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center text-lg">🎯</div>
            {isConnected && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Intake Agent</p>
            <p className="text-xs text-muted-foreground">Parses commands · Creates targets · Queues jobs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Connecting…
            </span>
          ) : isConnected ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              <Wifi className="w-3 h-3" /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
        </div>
      </div>

      {/* Safety banner */}
      <div className="mx-6 mt-4 rounded-xl bg-amber-500/8 border border-amber-500/20 px-4 py-2.5 flex items-start gap-2.5 shrink-0">
        <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-300/80 leading-relaxed">
          <span className="font-semibold text-amber-400">Ethics & Compliance: </span>
          Public sources only · No doxxing · Facts labeled separately from allegations · Presumption of innocence preserved
        </p>
      </div>

      {/* Quick commands */}
      <div className="flex gap-2 px-6 mt-3 flex-wrap shrink-0">
        {QUICK_COMMANDS.map((q) => (
          <button
            key={q.label}
            onClick={() => handleQuick(q.cmd)}
            disabled={isSending || isLoading}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full glass border border-border/60 text-muted-foreground',
              'hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              {/* Avatar */}
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5 border',
                msg.role === 'user'
                  ? 'bg-primary/20 text-primary border-primary/30'
                  : 'bg-sky-500/15 text-sky-400 border-sky-500/20'
              )}>
                {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Bubble */}
              <div className={cn(
                'max-w-[78%] rounded-2xl px-4 py-3 text-sm',
                msg.role === 'user'
                  ? 'bg-primary/15 border border-primary/20 text-foreground rounded-tr-sm'
                  : 'glass-card text-foreground rounded-tl-sm'
              )}>
                {msg.role === 'agent' ? (
                  <div className={cn(
                    'prose prose-invert prose-sm max-w-none',
                    'prose-code:bg-muted/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs',
                    'prose-pre:bg-muted/40 prose-pre:rounded-xl prose-pre:border prose-pre:border-border/40',
                    msg.isStreaming && 'typing-cursor'
                  )}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || ' '}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                )}
                <p className="text-xs text-muted-foreground/50 mt-2 text-right">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {agentIsTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 border border-border/40">
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 150, 300].map((delay, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-sky-400/60 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-2 shrink-0">
        <div className={cn(
          'glass-card rounded-2xl border transition-all duration-200 overflow-hidden',
          isSending ? 'border-primary/30' : 'border-border/70 focus-within:border-primary/50'
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder='Add: Target Name | type=company | jurisdiction=US | notes=...'
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none px-4 pt-3 pb-1 outline-none min-h-[52px] max-h-[120px]"
            rows={1}
            disabled={isSending || isLoading}
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3" /> Send
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" /> Shift+Enter new line
              </span>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending || isLoading}
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150',
                input.trim() && !isSending && !isLoading
                  ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20'
                  : 'bg-muted/60 text-muted-foreground cursor-not-allowed'
              )}
            >
              {isSending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Command hint */}
        {!isConnected && !isLoading && (
          <p className="text-xs text-muted-foreground/50 text-center mt-2">
            Waiting for connection… 
          </p>
        )}
        {isConnected && !isSending && (
          <p className="text-xs text-muted-foreground/40 text-center mt-2">
            Connected to Intake Agent · {messages.length} message{messages.length !== 1 ? 's' : ''} in session
          </p>
        )}
        {isSending && (
          <p className="text-xs text-primary/60 text-center mt-2 flex items-center justify-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Agent is processing…
          </p>
        )}
      </div>
    </div>
  );
}
