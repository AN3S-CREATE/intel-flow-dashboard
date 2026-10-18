import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Clock, AlertCircle, CheckCircle2, Loader2, SkipForward, Bot } from 'lucide-react';
import { Job, JOB_TYPE_LABELS, JOB_STATUS_LABELS } from '../types/osint';
import { fetchJobs } from '../services/api';
import { JobTypeBadge, JobStatusBadge } from './Badges';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

const STATUS_ORDER = ['rs-running', 'rs-pending', 'rs-retrying', 'rs-failed', 'rs-done', 'rs-skipped'];

const STAT_CONFIGS = [
  { key: 'rs-pending', label: 'Pending', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10' },
  { key: 'rs-running', label: 'Running', icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'rs-retrying', label: 'Retrying', icon: RefreshCw, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { key: 'rs-failed', label: 'Failed', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  { key: 'rs-done', label: 'Done', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
];

export default function QueueDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchJobs();
      const sorted = [...data].sort((a, b) => {
        const ao = STATUS_ORDER.indexOf(a.fieldValues['/attributes/@job03'] ?? 'rs-pending');
        const bo = STATUS_ORDER.indexOf(b.fieldValues['/attributes/@job03'] ?? 'rs-pending');
        return ao - bo;
      });
      setJobs(sorted);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  const counts = STAT_CONFIGS.reduce((acc, s) => {
    acc[s.key] = jobs.filter(j => j.fieldValues['/attributes/@job03'] === s.key).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.fieldValues['/attributes/@job03'] === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Job Queue</h2>
            <p className="text-sm text-muted-foreground">{jobs.length} total jobs · auto-refreshes every 30s</p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-border/60 text-sm text-muted-foreground hover:text-foreground transition-all"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {STAT_CONFIGS.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setFilter(filter === s.key ? 'all' : s.key)}
                className={cn(
                  'glass-card rounded-xl p-3 text-left transition-all border',
                  filter === s.key ? 'border-primary/40 bg-primary/5' : 'border-border/40 hover:border-border'
                )}
              >
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-2', s.bg)}>
                  <Icon className={cn('w-3.5 h-3.5', s.color, s.key === 'rs-running' && 'animate-spin')} />
                </div>
                <p className="text-xl font-bold text-foreground">{counts[s.key] ?? 0}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </button>
            );
          })}
        </div>

        {/* Jobs list */}
        {filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <SkipForward className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No jobs match this filter.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Add a target via Chat Intake to populate the queue.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((job, i) => {
                const status = job.fieldValues['/attributes/@job03'];
                const type = job.fieldValues['/attributes/@job02'];
                const agent = job.fieldValues['/attributes/@job08'];
                const delay = job.fieldValues['/attributes/@job05'];
                const attempts = job.fieldValues['/attributes/@job06'];
                const lastError = job.fieldValues['/attributes/@job07'];
                const isRunning = status === 'rs-running';
                const isFailed = status === 'rs-failed';

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      'glass-card rounded-xl p-4 border transition-all',
                      isRunning ? 'border-blue-500/30 bg-blue-500/5' : 'border-border/40',
                      isFailed ? 'border-red-500/20' : ''
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-2 shrink-0',
                          isRunning ? 'bg-blue-400 animate-pulse' :
                          isFailed ? 'bg-red-400' :
                          status === 'rs-done' ? 'bg-emerald-400' : 'bg-slate-500'
                        )} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {job.fieldValues['/text'] ?? 'Unnamed Job'}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {type && <JobTypeBadge type={type} />}
                            {status && <JobStatusBadge status={status} />}
                          </div>
                          {lastError && (
                            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {lastError}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        {agent && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Bot className="w-3 h-3" /> {agent}
                          </p>
                        )}
                        {delay !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            Delay: {delay}s
                          </p>
                        )}
                        {attempts !== undefined && attempts > 0 && (
                          <p className="text-xs text-orange-400">
                            {attempts} attempt{attempts !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
