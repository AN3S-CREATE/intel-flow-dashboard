import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Loader2, Inbox, ExternalLink, Eye } from 'lucide-react';
import { Target, Finding } from '../types/osint';
import { fetchTargets, fetchFindings } from '../services/api';
import { CategoryBadge, ConfidenceBadge, FVABadge, StatusBadge } from './Badges';
import { cn } from '../lib/utils';

export default function ReviewInbox() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, f] = await Promise.all([fetchTargets(), fetchFindings()]);
      setTargets(t);
      setFindings(f);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Items needing review: low confidence, allegation without fact corroboration, or unknown FvA
  const reviewItems = findings.filter(f => {
    const conf = f.fieldValues['/attributes/@fnd04'];
    const fva = f.fieldValues['/attributes/@fnd06'];
    const cat = f.fieldValues['/attributes/@fnd02'];
    const isLowConf = conf === 'conf-low';
    const isUnknown = fva === 'fva-unknown';
    const isSensitiveCat = cat === 'cat-litigation' || cat === 'cat-ethics' || cat === 'cat-regulatory';
    return isLowConf || isUnknown || (isSensitiveCat && conf !== 'conf-high');
  });

  const pending = reviewItems.filter(f => !reviewed.has(f.id));
  const done = reviewItems.filter(f => reviewed.has(f.id));

  const getTarget = (targetId?: string) =>
    targets.find(t => t.id === targetId);

  const markReviewed = (id: string) => {
    setReviewed(prev => new Set([...prev, id]));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Review Inbox</h2>
            <p className="text-sm text-muted-foreground">
              {pending.length} item{pending.length !== 1 ? 's' : ''} needing human review
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-400 font-medium">{pending.length} pending</span>
          </div>
        </div>

        {/* Explanation */}
        <div className="glass-card rounded-xl p-4 border border-border/40">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Items appear here when: <span className="text-foreground">confidence is Low</span>,
            a finding has no clear <span className="text-foreground">Fact vs Allegation</span> label,
            or sensitive categories (Litigation, Ethics, Regulatory) lack high-confidence sources.
            Review each item before including in the final profile.
          </p>
        </div>

        {/* Pending items */}
        {pending.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center border border-border/40">
            <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">All clear!</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              No findings currently need review.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              Needs Review
            </h3>
            <AnimatePresence>
              {pending.map((finding, i) => {
                const target = getTarget(finding.fieldValues['/attributes/@fnd01']);
                const conf = finding.fieldValues['/attributes/@fnd04'];
                const fva = finding.fieldValues['/attributes/@fnd06'];
                const cat = finding.fieldValues['/attributes/@fnd02'];
                const targetStatus = target?.fieldValues['/attributes/@tgt05'];

                return (
                  <motion.div
                    key={finding.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card rounded-xl border border-orange-500/20 overflow-hidden"
                  >
                    <div className="px-4 py-2.5 bg-orange-500/5 border-b border-orange-500/15 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-xs font-medium text-orange-400">Review Required</span>
                      </div>
                      {target && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {target.fieldValues['/text'] ?? target.text}
                          </span>
                          {targetStatus && <StatusBadge status={targetStatus} />}
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="text-sm text-foreground/90">
                        {finding.fieldValues['/attributes/@fnd03'] ?? finding.text ?? 'No summary available'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {cat && <CategoryBadge category={cat as any} />}
                        {conf && <ConfidenceBadge level={conf as any} />}
                        {fva && <FVABadge fva={fva as any} />}
                      </div>
                      {finding.fieldValues['/attributes/@fnd05'] && (
                        <a
                          href={finding.fieldValues['/attributes/@fnd05']}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View source
                        </a>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => markReviewed(finding.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Mark Reviewed
                        </button>
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-border/60 text-muted-foreground text-xs hover:text-foreground transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Profile
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Reviewed items */}
        {done.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Reviewed ({done.length})
            </h3>
            {done.map(finding => (
              <div
                key={finding.id}
                className="glass rounded-xl border border-border/30 px-4 py-3 opacity-50"
              >
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {finding.fieldValues['/attributes/@fnd03'] ?? finding.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
