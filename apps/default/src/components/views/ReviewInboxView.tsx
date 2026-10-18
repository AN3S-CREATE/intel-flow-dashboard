import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Flag, Scale, XCircle } from 'lucide-react';
import { fetchFindings, fetchTargets, dismissFinding, dismissTargetReview } from '../../services/api';
import type { Finding, Target, FindingCategory, ConfidenceLevel, FactAllegation } from '../../types/osint';
import { CATEGORY_LABELS } from '../../types/osint';
import { ConfidenceBadge, FvaBadge } from '../ui/Badge';
import { cn } from '../../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────
interface FlatFinding {
  id: string;
  targetId: string;
  category: FindingCategory;
  summary: string;
  confidence: ConfidenceLevel;
  evidenceLinks: string;
  factOrAllegation: FactAllegation;
}

function flattenFinding(f: Finding): FlatFinding {
  const fv = f.fieldValues;
  return {
    id: f.id,
    targetId: fv['/attributes/@fnd01'] ?? '',
    category: (fv['/attributes/@fnd02'] as FindingCategory) ?? 'cat-identity',
    summary: fv['/attributes/@fnd03'] ?? fv['/text'] ?? f.text ?? '',
    confidence: (fv['/attributes/@fnd04'] as ConfidenceLevel) ?? 'conf-low',
    evidenceLinks: fv['/attributes/@fnd05'] ?? '',
    factOrAllegation: (fv['/attributes/@fnd06'] as FactAllegation) ?? 'fva-unknown',
  };
}

interface ReviewItem {
  finding: FlatFinding;
  target?: Target;
  reason: string[];
  // true when the finding comes from a target-status flag (not a real finding node)
  isTargetFlag: boolean;
}

// ── Per-card dismiss state ────────────────────────────────────────────────────
type DismissState = 'idle' | 'saving' | 'done' | 'error';

function ReviewCard({
  item,
  onDismissed,
}: {
  item: ReviewItem;
  onDismissed: (id: string) => void;
}) {
  const [dismissState, setDismissState] = useState<DismissState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleDismiss = async () => {
    if (dismissState !== 'idle') return;
    setDismissState('saving');
    setErrorMsg(null);

    try {
      if (item.isTargetFlag) {
        // Target "Needs Review" flag → clear the target's status
        await dismissTargetReview(item.finding.targetId);
      } else {
        // Real finding node → mark as confirmed fact + high confidence
        await dismissFinding(item.finding.id);
      }
      if (!mountedRef.current) return;
      setDismissState('done');
      // Brief "done" flash then remove from list
      setTimeout(() => {
        if (mountedRef.current) onDismissed(item.finding.id);
      }, 600);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setErrorMsg(msg.length > 60 ? 'Server error — try again' : msg);
      setDismissState('error');
    }
  };

  const targetName = item.target
    ? (item.target.fieldValues['/text'] ?? item.target.text ?? item.target.id)
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      className={cn(
        'glass-card rounded-xl p-4 border-l-2 transition-colors duration-200',
        dismissState === 'done'
          ? 'border-l-emerald-500/60 bg-emerald-500/5'
          : 'border-l-amber-500/50',
      )}
    >
      {/* Reason tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {item.reason.map(r => (
          <span
            key={r}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400"
          >
            <Flag size={9} /> {r}
          </span>
        ))}
      </div>

      {/* Target label */}
      {targetName && (
        <p className="text-[11px] text-muted-foreground mb-2">
          Target: <span className="text-foreground font-medium">{targetName}</span>
        </p>
      )}

      {/* Category + badges */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-medium text-foreground">
          {CATEGORY_LABELS[item.finding.category]}
        </span>
        <div className="flex items-center gap-1.5">
          <ConfidenceBadge confidence={item.finding.confidence} />
          <FvaBadge fva={item.finding.factOrAllegation} />
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-foreground/80 leading-relaxed">{item.finding.summary}</p>

      {/* Evidence link */}
      {item.finding.evidenceLinks && (
        <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
          {item.finding.evidenceLinks}
        </p>
      )}

      {/* Inline error */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-1.5">
              <XCircle size={11} className="shrink-0" />
              {errorMsg}
              <button
                onClick={() => { setDismissState('idle'); setErrorMsg(null); }}
                className="ml-auto underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
        <button
          onClick={handleDismiss}
          disabled={dismissState !== 'idle'}
          className={cn(
            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200',
            dismissState === 'done'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : dismissState === 'saving'
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400/60 cursor-not-allowed'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20',
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {dismissState === 'saving' ? (
              <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" /> Saving…
              </motion.span>
            ) : dismissState === 'done' ? (
              <motion.span key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                <CheckCircle2 size={11} /> Saved ✓
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                <CheckCircle2 size={11} /> Mark Reviewed
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Hint about what gets written */}
        <span className="text-[10px] text-muted-foreground/50 ml-auto">
          {item.isTargetFlag ? 'Clears target review flag' : 'Writes to findings project'}
        </span>
      </div>
    </motion.div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export function ReviewInboxView() {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);

  // Remove a card from the list after its API call succeeds
  const handleDismissed = useCallback((id: string) => {
    setReviewItems(prev => prev.filter(item => item.finding.id !== id));
  }, []);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const [allFindings, allTargets] = await Promise.all([
        fetchFindings(),
        fetchTargets(),
      ]);

      const items: ReviewItem[] = [];

      for (const raw of allFindings) {
        const f = flattenFinding(raw);
        if (!f.summary.trim()) continue;
        const reasons: string[] = [];
        if (f.confidence === 'conf-low') reasons.push('Low confidence');
        if (f.factOrAllegation === 'fva-allegation') reasons.push('Contains allegations');
        if (f.factOrAllegation === 'fva-unknown') reasons.push('Unverified status');
        if (
          (f.category === 'cat-litigation' || f.category === 'cat-regulatory') &&
          f.confidence !== 'conf-high'
        ) {
          reasons.push('Legal/regulatory — needs primary source verification');
        }
        if (f.category === 'cat-ethics' && f.confidence !== 'conf-high') {
          reasons.push('Ethics flag — requires human review');
        }
        if (reasons.length > 0) {
          const target = allTargets.find(t => t.id === f.targetId);
          items.push({ finding: f, target, reason: reasons, isTargetFlag: false });
        }
      }

      // Targets flagged "Needs Review" get a synthetic card
      for (const t of allTargets) {
        if (t.fieldValues['/attributes/@tgt05'] === 'st-review') {
          const name = t.fieldValues['/text'] ?? t.text ?? t.id;
          items.push({
            finding: {
              id: `tgt-${t.id}`,
              targetId: t.id,
              category: 'cat-identity',
              summary: `Target "${name}" has been flagged as Needs Review.`,
              confidence: 'conf-low',
              evidenceLinks: '',
              factOrAllegation: 'fva-unknown',
            },
            target: t,
            reason: ['Target status: Needs Review'],
            isTargetFlag: true,
          });
        }
      }

      setReviewItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingCount = reviewItems.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle size={15} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Review Inbox</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              <AnimatePresence mode="wait">
                <motion.span
                  key={pendingCount}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="inline-block"
                >
                  {pendingCount} item{pendingCount !== 1 ? 's' : ''} requiring human review
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg glass border border-border hover:border-primary/30 hover:text-primary transition-all"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="px-6 pt-4 pb-2">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: AlertTriangle, label: 'Low Confidence',       color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
            { icon: Flag,          label: 'Contains Allegations', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
            { icon: Scale,         label: 'Legal Flags',          color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
          ].map(({ icon: Icon, label, color, bg }) => (
            <div key={label} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs', bg)}>
              <Icon size={11} className={color} />
              <span className={cn('font-medium', color)}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3 space-y-3 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="text-muted-foreground animate-spin" />
          </div>
        ) : reviewItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-48 text-center"
          >
            <CheckCircle2 size={36} className="text-emerald-400/30 mb-3" />
            <p className="text-sm text-muted-foreground">All clear — no items need review</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Low-confidence findings and allegations will appear here
            </p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {reviewItems.map(item => (
              <ReviewCard
                key={item.finding.id}
                item={item}
                onDismissed={handleDismissed}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
