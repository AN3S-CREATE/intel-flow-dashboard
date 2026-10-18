import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ExternalLink, Sparkles, WifiOff, RefreshCw } from 'lucide-react';
import type { LiveFinding } from '../hooks/useLiveFindings';
import type { FindingCategory, ConfidenceLevel, FactAllegation } from '../types/osint';
import { CATEGORY_LABELS } from '../types/osint';
import { cn } from '../lib/utils';

// ─── Visual maps ─────────────────────────────────────────────────────────────
const CAT_ICON: Record<FindingCategory, string> = {
  'cat-identity':    '🪪',
  'cat-roles':       '💼',
  'cat-ownership':   '🏛️',
  'cat-connections': '🔗',
  'cat-litigation':  '⚖️',
  'cat-regulatory':  '📋',
  'cat-ethics':      '🔍',
  'cat-media':       '📰',
};

const CAT_COLOR: Record<FindingCategory, string> = {
  'cat-identity':    'border-l-sky-500/50',
  'cat-roles':       'border-l-blue-500/50',
  'cat-ownership':   'border-l-amber-500/50',
  'cat-connections': 'border-l-purple-500/50',
  'cat-litigation':  'border-l-red-500/50',
  'cat-regulatory':  'border-l-orange-500/50',
  'cat-ethics':      'border-l-pink-500/50',
  'cat-media':       'border-l-emerald-500/50',
};

const CONF_DOT: Record<ConfidenceLevel, string> = {
  'conf-high':   'bg-emerald-400',
  'conf-medium': 'bg-amber-400',
  'conf-low':    'bg-red-400',
};

const FVA_LABEL: Record<FactAllegation, { text: string; color: string }> = {
  'fva-fact':       { text: 'FACT',    color: 'text-emerald-400' },
  'fva-allegation': { text: 'ALLEGED', color: 'text-orange-400' },
  'fva-unknown':    { text: '?',        color: 'text-muted-foreground' },
};

// ─── Single card ──────────────────────────────────────────────────────────────
function FindingCard({ finding }: { finding: LiveFinding }) {
  const fva = FVA_LABEL[finding.factOrAllegation];
  const hasLink = finding.evidenceLinks?.startsWith('http');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -8, scale: 0.96 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn(
        'relative rounded-xl border-l-2 pl-3 pr-3 py-2.5 transition-all duration-700',
        CAT_COLOR[finding.category],
        finding.isNew
          ? 'bg-primary/8 border border-primary/20 border-l-2 shadow-sm shadow-primary/10'
          : 'glass border border-border/40'
      )}
    >
      {/* New flash */}
      {finding.isNew && (
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 3.5 }}
          className="absolute inset-0 rounded-xl bg-primary/5 pointer-events-none"
        />
      )}

      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm leading-none shrink-0">{CAT_ICON[finding.category]}</span>
          <span className="text-[11px] font-medium text-foreground/80 truncate">
            {CATEGORY_LABELS[finding.category]}
          </span>
          {finding.isNew && (
            <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 shrink-0">
              <Sparkles size={8} />
              new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('text-[10px] font-semibold tracking-wide', fva.color)}>
            {fva.text}
          </span>
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', CONF_DOT[finding.confidence])} title={finding.confidence} />
        </div>
      </div>

      {/* Summary — truncate at 2 lines */}
      <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2">
        {finding.summary}
      </p>

      {/* Evidence link */}
      {hasLink && (
        <a
          href={finding.evidenceLinks}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors truncate"
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={9} className="shrink-0" />
          <span className="truncate">{finding.evidenceLinks.replace(/^https?:\/\//, '').slice(0, 45)}</span>
        </a>
      )}
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12 gap-3">
      <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center">
        <Activity size={18} className="text-muted-foreground/40" />
      </div>
      <p className="text-xs text-muted-foreground">Findings appear here as agents work</p>
      <p className="text-[10px] text-muted-foreground/50 leading-relaxed max-w-[160px]">
        Add a target via chat to start the pipeline
      </p>
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────
interface FindingsFeedProps {
  findings: LiveFinding[];
  isPolling: boolean;
  totalCount: number;
  fetchError?: string | null;
  onRetry?: () => void;
}

export function FindingsFeed({ findings = [], isPolling, totalCount, fetchError, onRetry }: FindingsFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Auto-scroll to top when a new finding arrives
  useEffect(() => {
    const newOnes = findings.filter(f => f.isNew);
    if (newOnes.length > 0 && prevCountRef.current !== findings.length) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevCountRef.current = findings.length;
  }, [findings]);

  const newCount = findings.filter(f => f.isNew).length;

  return (
    <div className="flex flex-col h-full border-l border-border/50 bg-card/20 backdrop-blur-sm w-64 shrink-0">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity size={13} className="text-primary" />
            {isPolling && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <p className="text-xs font-semibold text-foreground">Live Findings</p>
        </div>
        <div className="flex items-center gap-1.5">
          {newCount > 0 && (
            <motion.span
              key={newCount}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 font-medium"
            >
              +{newCount}
            </motion.span>
          )}
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {totalCount} total
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[9px] text-muted-foreground">High</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-[9px] text-muted-foreground">Med</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <span className="text-[9px] text-muted-foreground">Low</span>
        </div>
        <div className="ml-auto text-[9px] text-muted-foreground/50">confidence →</div>
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 min-h-0"
      >
        {findings.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {findings.map(f => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer — error state or polling indicator */}
      <div className="px-3 py-2 border-t border-border/30 shrink-0">
        <AnimatePresence mode="wait">
          {fetchError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-1.5"
            >
              <WifiOff size={10} className="text-red-400 shrink-0" />
              <p className="text-[9px] text-red-400 flex-1 truncate">{fetchError}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-[9px] text-primary hover:underline flex items-center gap-0.5 shrink-0"
                >
                  <RefreshCw size={8} /> Retry
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="polling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
            >
              <div className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors duration-500',
                isPolling ? 'bg-emerald-400 animate-pulse' : 'bg-border'
              )} />
              <p className="text-[9px] text-muted-foreground">
                {isPolling ? 'Polling…' : 'Polling every 8s'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
