import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ExternalLink, ChevronRight, Users, Building2, FileText, Globe } from 'lucide-react';
import { Target, Finding, Source } from '../types/osint';
import { fetchTargets, fetchFindings, fetchSources } from '../services/api';
import { StatusBadge, PriorityBadge, TargetTypeBadge, CategoryBadge, ConfidenceBadge, FVABadge, SourceTypeBadge } from './Badges';
import { cn } from '../lib/utils';

export default function TargetsView() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<Target | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, f, s] = await Promise.all([fetchTargets(), fetchFindings(), fetchSources()]);
      setTargets(t);
      setFindings(f);
      setSources(s);
      if (!selected && t.length > 0) setSelected(t[0]);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = targets.filter(t =>
    (t.fieldValues['/text'] ?? t.text ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const targetFindings = selected
    ? findings.filter(f => f.fieldValues['/attributes/@fnd01'] === selected.id)
    : [];

  const targetSources = selected
    ? sources.filter(s => s.fieldValues['/attributes/@src01'] === selected.id)
    : [];

  const groupedFindings = targetFindings.reduce((acc, f) => {
    const cat = f.fieldValues['/attributes/@fnd02'] ?? 'cat-identity';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {} as Record<string, Finding[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar — Target list */}
      <div className="w-72 border-r border-border/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2 px-3 py-2 glass rounded-xl border border-border/60">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search targets…"
              className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No targets yet. Use Chat Intake to add one.
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((t, i) => {
                const name = t.fieldValues['/text'] ?? t.text ?? 'Unknown';
                const type = t.fieldValues['/attributes/@tgt01'];
                const status = t.fieldValues['/attributes/@tgt05'];
                const priority = t.fieldValues['/attributes/@tgt06'];
                const isSelected = selected?.id === t.id;
                const fCount = findings.filter(f => f.fieldValues['/attributes/@fnd01'] === t.id).length;

                return (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(t)}
                    className={cn(
                      'w-full text-left rounded-xl p-3 transition-all',
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/40 border border-transparent'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {type === 'tp-person'
                        ? <Users className="w-3 h-3 text-indigo-400" />
                        : <Building2 className="w-3 h-3 text-amber-400" />}
                      {status && <StatusBadge status={status} />}
                    </div>
                    {fCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{fCount} finding{fCount !== 1 ? 's' : ''}</p>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Main — Target Profile */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Select a target to view their profile</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-3xl">
            {/* Profile header */}
            <div className="glass-card rounded-2xl p-5 border border-border/50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {selected.fieldValues['/text'] ?? selected.text ?? 'Unknown'}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {selected.fieldValues['/attributes/@tgt01'] && (
                      <TargetTypeBadge type={selected.fieldValues['/attributes/@tgt01']!} />
                    )}
                    {selected.fieldValues['/attributes/@tgt05'] && (
                      <StatusBadge status={selected.fieldValues['/attributes/@tgt05']!} />
                    )}
                    {selected.fieldValues['/attributes/@tgt06'] && (
                      <PriorityBadge priority={selected.fieldValues['/attributes/@tgt06']!} />
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                {selected.fieldValues['/attributes/@tgt03'] && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Jurisdiction</p>
                    <p className="flex items-center gap-1.5 text-foreground">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      {selected.fieldValues['/attributes/@tgt03']}
                    </p>
                  </div>
                )}
                {selected.fieldValues['/attributes/@tgt02'] && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Aliases</p>
                    <p className="text-foreground">{selected.fieldValues['/attributes/@tgt02']}</p>
                  </div>
                )}
                {selected.fieldValues['/attributes/@tgt04'] && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-foreground/80">{selected.fieldValues['/attributes/@tgt04']}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Findings by category */}
            {Object.keys(groupedFindings).length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Findings</h3>
                {Object.entries(groupedFindings).map(([cat, catFindings]) => (
                  <div key={cat} className="glass-card rounded-xl border border-border/40 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
                      <CategoryBadge category={cat as any} />
                      <span className="text-xs text-muted-foreground">{catFindings.length} finding{catFindings.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="divide-y divide-border/20">
                      {catFindings.map(f => (
                        <div key={f.id} className="px-4 py-3 space-y-2">
                          <p className="text-sm text-foreground/90">{f.fieldValues['/attributes/@fnd03'] ?? f.text}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {f.fieldValues['/attributes/@fnd04'] && <ConfidenceBadge level={f.fieldValues['/attributes/@fnd04']!} />}
                            {f.fieldValues['/attributes/@fnd06'] && <FVABadge fva={f.fieldValues['/attributes/@fnd06']!} />}
                          </div>
                          {f.fieldValues['/attributes/@fnd05'] && (
                            <a href={f.fieldValues['/attributes/@fnd05']} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              {f.fieldValues['/attributes/@fnd05']}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-8 text-center border border-border/40">
                <p className="text-muted-foreground text-sm">No findings yet. Run the research pipeline to populate this profile.</p>
              </div>
            )}

            {/* Sources */}
            {targetSources.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sources</h3>
                {targetSources.map(s => (
                  <div key={s.id} className="glass-card rounded-xl border border-border/40 px-4 py-3 flex items-start gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {s.fieldValues['/attributes/@src03'] && <SourceTypeBadge type={s.fieldValues['/attributes/@src03']!} />}
                      </div>
                      {s.fieldValues['/attributes/@src02'] && (
                        <a href={s.fieldValues['/attributes/@src02']} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline truncate block">
                          {s.fieldValues['/attributes/@src02']}
                        </a>
                      )}
                      {s.fieldValues['/attributes/@src05'] && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.fieldValues['/attributes/@src05']}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
