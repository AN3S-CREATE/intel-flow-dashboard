import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Building2, User, Globe, ChevronRight, ExternalLink, AlertTriangle, Shield, FileText, RefreshCw, ChevronDown, Check, Download, CheckCircle2, Search, X } from 'lucide-react';
import { fetchTargets, fetchFindings, fetchSources, updateTargetStatus } from '../../services/api';
import type { Target, Finding, Source, FindingCategory, TargetType, TargetStatus, TargetPriority, FindingCategory as FC, ConfidenceLevel, FactAllegation, SourceType, CredibilityRating } from '../../types/osint';
import { CATEGORY_LABELS, SOURCE_TYPE_LABELS, STATUS_LABELS } from '../../types/osint';
import { StatusBadge, PriorityBadge, ConfidenceBadge, FvaBadge } from '../ui/Badge';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import { buildMarkdownReport, downloadMarkdown, slugify } from '../../lib/exportMarkdown';

const CATEGORY_ICONS: Record<FindingCategory, string> = {
  'cat-identity': '🪪', 'cat-roles': '💼', 'cat-ownership': '🏛️',
  'cat-connections': '🔗', 'cat-litigation': '⚖️', 'cat-regulatory': '📋',
  'cat-ethics': '🔍', 'cat-media': '📰',
};

const CATEGORY_ORDER: FindingCategory[] = [
  'cat-identity', 'cat-roles', 'cat-ownership', 'cat-connections',
  'cat-litigation', 'cat-regulatory', 'cat-ethics', 'cat-media',
];

/** Renders text with query substrings highlighted in amber. */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-400/25 text-amber-300 rounded px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

// Status transition flow: which statuses are valid next steps
const STATUS_FLOW: Record<TargetStatus, TargetStatus[]> = {
  'st-new':        ['st-queued', 'st-blocked'],
  'st-queued':     ['st-inprogress', 'st-blocked'],
  'st-inprogress': ['st-review', 'st-completed', 'st-blocked'],
  'st-review':     ['st-completed', 'st-inprogress', 'st-blocked'],
  'st-completed':  ['st-new'],
  'st-blocked':    ['st-new', 'st-queued'],
};

const STATUS_COLORS: Record<TargetStatus, string> = {
  'st-new':        'text-muted-foreground border-border hover:border-muted-foreground/50',
  'st-queued':     'text-amber-400 border-amber-500/30 hover:border-amber-500/50',
  'st-inprogress': 'text-sky-400 border-sky-500/30 hover:border-sky-500/50',
  'st-review':     'text-orange-400 border-orange-500/30 hover:border-orange-500/50',
  'st-completed':  'text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50',
  'st-blocked':    'text-red-400 border-red-500/30 hover:border-red-500/50',
};

function StatusChanger({
  target,
  onStatusChange,
}: {
  target: Target;
  onStatusChange: (targetId: string, newStatus: TargetStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = targetStatus(target);
  const nextOptions = STATUS_FLOW[current] ?? [];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleChange = async (status: TargetStatus) => {
    setOpen(false);
    setSaving(true);
    onStatusChange(target.id, status); // optimistic
    try {
      await updateTargetStatus(target.id, status);
    } catch (err) {
      console.error('Failed to update status', err);
      onStatusChange(target.id, current); // revert
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving || nextOptions.length === 0}
        className={cn(
          'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all',
          STATUS_COLORS[current],
          saving && 'opacity-50 pointer-events-none'
        )}
        title="Change target status"
      >
        {saving ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <StatusBadge status={current} />
        )}
        {nextOptions.length > 0 && <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-1 right-0 z-20 w-44 glass-card rounded-xl border border-border shadow-xl shadow-black/30 overflow-hidden"
          >
            <div className="p-1">
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider px-2 pt-1 pb-1.5">Move to</p>
              {nextOptions.map(status => (
                <button
                  key={status}
                  onClick={() => handleChange(status)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                >
                  <Check size={10} className="text-transparent group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-xs text-foreground">{STATUS_LABELS[status]}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Helpers to read from fieldValues ──────────────────────────────────────────
function targetName(t: Target) { return t.fieldValues['/text'] ?? t.text ?? t.id; }
function targetType(t: Target) { return (t.fieldValues['/attributes/@tgt01'] ?? 'tp-company') as TargetType; }
function targetStatus(t: Target) { return (t.fieldValues['/attributes/@tgt05'] ?? 'st-new') as TargetStatus; }
function targetPriority(t: Target) { return (t.fieldValues['/attributes/@tgt06'] ?? 'pr-medium') as TargetPriority; }
function targetJurisdiction(t: Target) { return t.fieldValues['/attributes/@tgt03'] ?? ''; }
function targetNotes(t: Target) { return t.fieldValues['/attributes/@tgt04'] ?? ''; }

interface FlatFinding {
  id: string; targetId: string; category: FC; summary: string;
  confidence: ConfidenceLevel; evidenceLinks: string; factOrAllegation: FactAllegation;
}
function flatFinding(f: Finding): FlatFinding {
  const fv = f.fieldValues;
  return {
    id: f.id,
    targetId: fv['/attributes/@fnd01'] ?? '',
    category: (fv['/attributes/@fnd02'] as FC) ?? 'cat-identity',
    summary: fv['/attributes/@fnd03'] ?? fv['/text'] ?? f.text ?? '',
    confidence: (fv['/attributes/@fnd04'] as ConfidenceLevel) ?? 'conf-low',
    evidenceLinks: fv['/attributes/@fnd05'] ?? '',
    factOrAllegation: (fv['/attributes/@fnd06'] as FactAllegation) ?? 'fva-unknown',
  };
}
interface FlatSource {
  id: string; targetId: string; url: string; snippet: string;
  sourceType: SourceType; credibility: CredibilityRating;
}
function flatSource(s: Source): FlatSource {
  const fv = s.fieldValues;
  return {
    id: s.id,
    targetId: fv['/attributes/@src01'] ?? '',
    url: fv['/attributes/@src02'] ?? '',
    sourceType: (fv['/attributes/@src03'] as SourceType) ?? 'srt-other',
    // src04 = Date Accessed, src05 = Extracted Snippet (correct field)
    snippet: fv['/attributes/@src05'] ?? '',
    credibility: (fv['/attributes/@src06'] as CredibilityRating) ?? 'cr-medium',
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function TargetCard({ target, isSelected, onClick }: { target: Target; isSelected: boolean; onClick: () => void }) {
  const isCompany = targetType(target) === 'tp-company';
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center gap-3',
        isSelected ? 'bg-primary/10 border-primary/30 text-foreground' : 'glass border-border hover:border-primary/20 hover:bg-primary/5'
      )}
    >
      <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0',
        isCompany ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400')}>
        {isCompany ? <Building2 size={14} /> : <User size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{targetName(target)}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <StatusBadge status={targetStatus(target)} />
          <PriorityBadge priority={targetPriority(target)} />
        </div>
      </div>
      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
    </button>
  );
}

function FindingCard({ finding, query = '' }: { finding: FlatFinding; query?: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{CATEGORY_ICONS[finding.category]}</span>
          <span className="text-xs font-medium text-foreground">
            <Highlight text={CATEGORY_LABELS[finding.category]} query={query} />
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ConfidenceBadge confidence={finding.confidence} />
          <FvaBadge fva={finding.factOrAllegation} />
        </div>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        <Highlight text={finding.summary} query={query} />
      </p>
      {finding.evidenceLinks && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <a
            href={finding.evidenceLinks.startsWith('http') ? finding.evidenceLinks : '#'}
            target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary flex items-center gap-1 hover:underline"
            onClick={e => { if (!finding.evidenceLinks.startsWith('http')) e.preventDefault(); }}
          >
            <ExternalLink size={10} />
            <Highlight text={finding.evidenceLinks.substring(0, 60) + (finding.evidenceLinks.length > 60 ? '…' : '')} query={query} />
          </a>
        </div>
      )}
    </div>
  );
}

function SourceCard({ source }: { source: FlatSource }) {
  const credVariant = source.credibility === 'cr-high' ? 'success' : source.credibility === 'cr-medium' ? 'warning' : 'danger';
  return (
    <div className="flex items-start gap-3 p-3 glass rounded-xl border border-border/50">
      <Badge variant="muted" size="sm">{SOURCE_TYPE_LABELS[source.sourceType]}</Badge>
      <div className="min-w-0 flex-1">
        {source.url && (
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
            <ExternalLink size={10} className="shrink-0" />
            <span className="truncate">{source.url}</span>
          </a>
        )}
        {source.snippet && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{source.snippet}</p>}
      </div>
      <Badge variant={credVariant} size="sm">
        {source.credibility === 'cr-high' ? 'High' : source.credibility === 'cr-medium' ? 'Med' : 'Low'}
      </Badge>
    </div>
  );
}

// ── Export button ─────────────────────────────────────────────────────────────
type ExportState = 'idle' | 'exporting' | 'done';

function ExportButton({
  target,
  findings,
  sources,
}: {
  target: Target;
  findings: FlatFinding[];
  sources: FlatSource[];
}) {
  const [state, setState] = useState<ExportState>('idle');

  const handleExport = async () => {
    if (state !== 'idle') return;
    setState('exporting');

    // Small async tick so the spinner renders before the blocking markdown build
    await new Promise(r => setTimeout(r, 60));

    try {
      const md       = buildMarkdownReport(target, findings, sources);
      const name     = target.fieldValues['/text'] ?? target.text ?? 'target';
      const filename = `osint-report-${slugify(name)}-${new Date().toISOString().slice(0, 10)}.md`;
      downloadMarkdown(filename, md);
      setState('done');
      setTimeout(() => setState('idle'), 2500);
    } catch (err) {
      console.error('Export failed', err);
      setState('idle');
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={state === 'exporting'}
      title="Export findings as Markdown report"
      className={cn(
        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200',
        state === 'done'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'glass border-border text-muted-foreground hover:border-primary/30 hover:text-primary',
        state === 'exporting' && 'opacity-60 pointer-events-none',
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === 'done' ? (
          <motion.span
            key="done"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5"
          >
            <CheckCircle2 size={12} />
            Exported
          </motion.span>
        ) : state === 'exporting' ? (
          <motion.span
            key="exporting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <Loader2 size={12} className="animate-spin" />
            Building…
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <Download size={12} />
            Export .md
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────────
export function TargetProfileView() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [findings, setFindings] = useState<FlatFinding[]>([]);
  const [sources, setSources] = useState<FlatSource[]>([]);
  const [isLoadingTargets, setIsLoadingTargets] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // ── Search state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<FC | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset filters when the target changes
  useEffect(() => {
    setSearchQuery('');
    setActiveCategoryFilter(null);
  }, [selectedTarget?.id]);

  // ── Filtered findings (pure derivation — no extra state) ────────────────────
  const filteredFindings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return findings.filter(f => {
      const matchesCategory = activeCategoryFilter === null || f.category === activeCategoryFilter;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        f.summary.toLowerCase().includes(q) ||
        CATEGORY_LABELS[f.category].toLowerCase().includes(q) ||
        f.evidenceLinks.toLowerCase().includes(q)
      );
    });
  }, [findings, searchQuery, activeCategoryFilter]);

  const filteredGrouped = useMemo(() =>
    filteredFindings.reduce((acc, f) => {
      (acc[f.category] ??= []).push(f);
      return acc;
    }, {} as Record<FC, FlatFinding[]>),
  [filteredFindings]);

  // ── Categories that actually have findings (for filter pills) ───────────────
  const availableCategories = useMemo(() =>
    CATEGORY_ORDER.filter(cat => findings.some(f => f.category === cat)),
  [findings]);

  // Optimistic status update: patches target in local state immediately
  const handleStatusChange = useCallback((targetId: string, newStatus: TargetStatus) => {
    const patch = (t: Target): Target => ({
      ...t,
      fieldValues: { ...t.fieldValues, '/attributes/@tgt05': newStatus },
    });
    setTargets(prev => prev.map(t => t.id === targetId ? patch(t) : t));
    setSelectedTarget(prev => prev?.id === targetId ? patch(prev) : prev);
  }, []);

  const loadTargets = useCallback(async () => {
    setIsLoadingTargets(true);
    try {
      const data = await fetchTargets();
      setTargets(data);
      if (data.length > 0) setSelectedTarget(prev => prev ?? data[0]);
    } catch (err) { console.error(err); }
    finally { setIsLoadingTargets(false); }
  }, []);

  useEffect(() => { loadTargets(); }, [loadTargets]);

  useEffect(() => {
    if (!selectedTarget) return;
    const loadDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const [allFindings, allSources] = await Promise.all([fetchFindings(), fetchSources()]);
        const flat = allFindings.map(flatFinding).filter(f => f.summary.trim());
        const targetId = selectedTarget.id;
        setFindings(flat.filter(f => f.targetId === targetId || !f.targetId));
        setSources(allSources.map(flatSource).filter(s => s.targetId === targetId || !s.targetId));
      } catch (err) { console.error(err); }
      finally { setIsLoadingDetails(false); }
    };
    loadDetails();
  }, [selectedTarget]);

  const hasNeedsReview = findings.some(f => f.confidence === 'conf-low' || f.factOrAllegation === 'fva-allegation');
  const isFiltering = searchQuery.trim().length > 0 || activeCategoryFilter !== null;

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Targets</h3>
          <button onClick={loadTargets} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={13} className={isLoadingTargets ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoadingTargets ? (
            <div className="flex items-center justify-center h-32"><Loader2 size={20} className="text-muted-foreground animate-spin" /></div>
          ) : targets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">No targets yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Use Chat Intake to add one</p>
            </div>
          ) : targets.map(t => (
            <TargetCard key={t.id} target={t} isSelected={selectedTarget?.id === t.id} onClick={() => setSelectedTarget(t)} />
          ))}
        </div>
      </div>

      {/* Profile */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!selectedTarget ? (
          <div className="flex items-center justify-center h-full text-center px-8">
            <div>
              <FileText size={40} className="text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Select a target to view its profile</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-xl border flex items-center justify-center',
                    targetType(selectedTarget) === 'tp-company' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400')}>
                    {targetType(selectedTarget) === 'tp-company' ? <Building2 size={20} /> : <User size={20} />}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{targetName(selectedTarget)}</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="muted" size="sm">{targetType(selectedTarget) === 'tp-company' ? 'Company' : 'Person'}</Badge>
                      <PriorityBadge priority={targetPriority(selectedTarget)} />
                      {targetJurisdiction(selectedTarget) && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe size={11} /> {targetJurisdiction(selectedTarget)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <ExportButton
                      target={selectedTarget}
                      findings={findings}
                      sources={sources}
                    />
                    <StatusChanger
                      target={selectedTarget}
                      onStatusChange={handleStatusChange}
                    />
                  </div>
                  {hasNeedsReview && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                      <AlertTriangle size={12} /> Needs Review
                    </div>
                  )}
                </div>
              </div>
              {targetNotes(selectedTarget) && (
                <p className="mt-4 text-sm text-muted-foreground border-t border-border/50 pt-3">{targetNotes(selectedTarget)}</p>
              )}
            </motion.div>

            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <Shield size={12} className="text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-emerald-400/80">Public sources only. Allegations labeled. No personal identifiers collected.</p>
            </div>

            <div>
              {/* Section header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Intelligence Findings
                  {!isLoadingDetails && findings.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {isFiltering
                        ? `${filteredFindings.length} of ${findings.length}`
                        : findings.length}
                    </span>
                  )}
                </h2>
              </div>

              {/* Search bar */}
              {!isLoadingDetails && findings.length > 0 && (
                <div className="mb-3 space-y-2">
                  {/* Keyword input */}
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search findings…"
                      className={cn(
                        'w-full pl-8 pr-8 py-2 text-sm rounded-lg border bg-transparent',
                        'text-foreground placeholder:text-muted-foreground/50',
                        'transition-colors duration-150 outline-none',
                        searchQuery
                          ? 'border-primary/40 ring-1 ring-primary/20'
                          : 'border-border hover:border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/20',
                      )}
                    />
                    <AnimatePresence>
                      {searchQuery && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={{ duration: 0.12 }}
                          onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Clear search"
                        >
                          <X size={13} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Category filter pills */}
                  {availableCategories.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setActiveCategoryFilter(null)}
                        className={cn(
                          'text-[11px] px-2.5 py-1 rounded-full border transition-all duration-150',
                          activeCategoryFilter === null
                            ? 'bg-primary/15 border-primary/40 text-primary'
                            : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
                        )}
                      >
                        All
                      </button>
                      {availableCategories.map(cat => {
                        const isActive = activeCategoryFilter === cat;
                        const count = findings.filter(f => f.category === cat).length;
                        return (
                          <button
                            key={cat}
                            onClick={() => setActiveCategoryFilter(isActive ? null : cat)}
                            className={cn(
                              'flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all duration-150',
                              isActive
                                ? 'bg-primary/15 border-primary/40 text-primary'
                                : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
                            )}
                          >
                            <span>{CATEGORY_ICONS[cat]}</span>
                            {CATEGORY_LABELS[cat]}
                            <span className={cn('ml-0.5', isActive ? 'text-primary/70' : 'text-muted-foreground/50')}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Results */}
              {isLoadingDetails ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 size={20} className="text-muted-foreground animate-spin" />
                </div>
              ) : findings.length === 0 ? (
                <div className="glass-card rounded-xl p-8 text-center">
                  <p className="text-sm text-muted-foreground">No findings yet — jobs are queued for this target</p>
                </div>
              ) : filteredFindings.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card rounded-xl p-8 text-center"
                >
                  <Search size={28} className="text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No findings match</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {searchQuery ? `"${searchQuery}"` : 'the selected filter'}
                    {' '}— try a different term
                  </p>
                  <button
                    onClick={() => { setSearchQuery(''); setActiveCategoryFilter(null); }}
                    className="mt-3 text-xs text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  <div className="space-y-4">
                    {CATEGORY_ORDER.filter(cat => filteredGrouped[cat]?.length).map(cat => (
                      <motion.div
                        key={cat}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <span>{CATEGORY_ICONS[cat]}</span>
                          {CATEGORY_LABELS[cat]}
                          <span className="text-primary">({filteredGrouped[cat].length})</span>
                        </h3>
                        <div className="space-y-2">
                          {filteredGrouped[cat].map(f => (
                            <FindingCard key={f.id} finding={f} query={searchQuery} />
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </div>

            {sources.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Sources ({sources.length})</h2>
                <div className="space-y-2">{sources.map(s => <SourceCard key={s.id} source={s} />)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
