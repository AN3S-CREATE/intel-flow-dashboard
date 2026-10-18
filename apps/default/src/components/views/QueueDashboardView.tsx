import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Clock, AlertCircle, CheckCircle2, Loader2,
  FlaskConical, FileSearch, FileText, Search, Crosshair, Zap, AlertTriangle,
} from 'lucide-react';
import { fetchJobs } from '../../services/api';
import type { Job, JobType, JobStatus } from '../../types/osint';
import { JOB_TYPE_LABELS, JOB_STATUS_LABELS } from '../../types/osint';
import { JobStatusBadge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';

const JOB_TYPE_ICONS: Record<JobType, React.ElementType> = {
  'jt-discovery': Search,
  'jt-scrape': Crosshair,
  'jt-summarize': FlaskConical,
  'jt-crosscheck': FileSearch,
  'jt-report': FileText,
};

const JOB_TYPE_COLORS: Record<JobType, string> = {
  'jt-discovery': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'jt-scrape': 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  'jt-summarize': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'jt-crosscheck': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'jt-report': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const JOB_TYPE_PROGRESS_COLOR: Record<JobType, string> = {
  'jt-discovery': 'bg-purple-400',
  'jt-scrape': 'bg-sky-400',
  'jt-summarize': 'bg-amber-400',
  'jt-crosscheck': 'bg-orange-400',
  'jt-report': 'bg-emerald-400',
};

// Estimated durations per job type (seconds) for progress bar animation
const JOB_TYPE_ESTIMATED_DURATION: Record<JobType, number> = {
  'jt-discovery': 45,
  'jt-scrape': 30,
  'jt-summarize': 60,
  'jt-crosscheck': 50,
  'jt-report': 40,
};

const STATUS_ORDER: Record<JobStatus, number> = {
  'rs-running': 0,
  'rs-retrying': 1,
  'rs-pending': 2,
  'rs-failed': 3,
  'rs-skipped': 4,
  'rs-done': 5,
};

const STATS = [
  { label: 'Pending', status: 'rs-pending' as JobStatus, color: 'text-muted-foreground' },
  { label: 'Running', status: 'rs-running' as JobStatus, color: 'text-sky-400' },
  { label: 'Done', status: 'rs-done' as JobStatus, color: 'text-emerald-400' },
  { label: 'Failed', status: 'rs-failed' as JobStatus, color: 'text-red-400' },
];

// ─── Live elapsed timer for running jobs ───────────────────────────────────────
function useElapsedSeconds(startTime: string | undefined, isRunning: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !startTime) { setElapsed(0); return; }
    const base = differenceInSeconds(new Date(), new Date(startTime));
    setElapsed(base);
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning, startTime]);

  return elapsed;
}

// ─── Animated progress bar for running jobs ────────────────────────────────────
function RunningProgressBar({ jobType, startTime }: { jobType: JobType; startTime?: string }) {
  const elapsed = useElapsedSeconds(startTime, true);
  const estimated = JOB_TYPE_ESTIMATED_DURATION[jobType];
  // Cap at 95% until job actually completes
  const rawPct = Math.min((elapsed / estimated) * 100, 95);
  const isStuck = elapsed > 300; // 5 min warning

  return (
    <div className="mt-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className={cn('text-[10px]', isStuck ? 'text-amber-400' : 'text-sky-400/70')}>
          {isStuck ? (
            <span className="flex items-center gap-1"><AlertTriangle size={9} /> May be stuck ({Math.floor(elapsed / 60)}m)</span>
          ) : (
            `Running · ${elapsed}s elapsed`
          )}
        </span>
        <span className="text-[10px] text-muted-foreground">{Math.round(rawPct)}%</span>
      </div>
      <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', isStuck ? 'bg-amber-400' : JOB_TYPE_PROGRESS_COLOR[jobType])}
          initial={{ width: 0 }}
          animate={{ width: `${rawPct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─── Job card ──────────────────────────────────────────────────────────────────
function JobCard({ job }: { job: Job }) {
  const fv = job.fieldValues;
  const jobType = (fv['/attributes/@job02'] ?? 'jt-discovery') as JobType;
  const status = (fv['/attributes/@job03'] ?? 'rs-pending') as JobStatus;
  const assignedAgent = fv['/attributes/@job08'] ?? '';
  const lastError = fv['/attributes/@job07'] ?? '';
  const delaySeconds = fv['/attributes/@job05'] ?? 0;
  const attemptCount = fv['/attributes/@job06'] ?? 0;
  const scheduledTime = fv['/attributes/@job04'] ?? '';

  const Icon = JOB_TYPE_ICONS[jobType];
  const isRunning = status === 'rs-running';
  const isRetrying = status === 'rs-retrying';
  const isFailed = status === 'rs-failed';
  const isDone = status === 'rs-done';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        'glass-card rounded-xl p-4 relative overflow-hidden transition-colors',
        isRunning && 'border-sky-500/30',
        isRetrying && 'border-amber-500/30',
        isFailed && 'border-red-500/20',
        isDone && 'border-emerald-500/10 opacity-80',
      )}
    >
      {/* Running shimmer */}
      {isRunning && (
        <div className="absolute inset-0 bg-sky-500/3 animate-pulse pointer-events-none" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn(
            'w-8 h-8 rounded-lg border flex items-center justify-center shrink-0',
            JOB_TYPE_COLORS[jobType]
          )}>
            {isRunning ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={14} />
              </motion.div>
            ) : (
              <Icon size={14} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{job.text}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {JOB_TYPE_LABELS[jobType]} · Agent: {assignedAgent || '—'}
            </p>
            {isFailed && lastError && (
              <p className="text-xs text-red-400/80 mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> {lastError}
              </p>
            )}
            {isRetrying && (
              <p className="text-xs text-amber-400/80 mt-1 flex items-center gap-1">
                <RefreshCw size={10} className="animate-spin" /> Retrying (attempt #{attemptCount})…
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <JobStatusBadge status={status} />
          {isDone && <CheckCircle2 size={12} className="text-emerald-400" />}
        </div>
      </div>

      {/* Live progress bar for running jobs */}
      {isRunning && (
        <RunningProgressBar jobType={jobType} startTime={scheduledTime || undefined} />
      )}

      {/* Footer metadata */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock size={10} />
          {scheduledTime
            ? `Scheduled ${formatDistanceToNow(new Date(scheduledTime), { addSuffix: true })}`
            : 'Not scheduled'}
        </span>
        <span className="text-[11px] text-muted-foreground">Delay: {delaySeconds}s</span>
        {Number(attemptCount) > 1 && (
          <span className="text-[11px] text-amber-400">Attempt #{attemptCount}</span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────────
export function QueueDashboardView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guard against concurrent fetchJobs calls (manual Refresh + polling timer firing together)
  const isFetchingRef = useRef(false);

  const loadJobs = useCallback(async (silent = false) => {
    // If a request is already in-flight, skip — prevents race conditions on
    // rapid Refresh clicks or when the adaptive timer fires simultaneously.
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setIsLoading(true);
    try {
      const data = await fetchJobs();
      const sorted = data.sort((a, b) => {
        const sa = (a.fieldValues['/attributes/@job03'] ?? 'rs-pending') as JobStatus;
        const sb = (b.fieldValues['/attributes/@job03'] ?? 'rs-pending') as JobStatus;
        return STATUS_ORDER[sa] - STATUS_ORDER[sb];
      });
      setJobs(sorted);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      isFetchingRef.current = false;
      if (!silent) setIsLoading(false);
    }
  }, []);

  const getStatus = (j: Job) => (j.fieldValues['/attributes/@job03'] ?? 'rs-pending') as JobStatus;
  const activeCount = jobs.filter(j => getStatus(j) === 'rs-running').length;

  // Adaptive polling: 8s when jobs are running, 30s otherwise
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const delay = activeCount > 0 ? 8000 : 30000;
    intervalRef.current = setInterval(() => loadJobs(true), delay);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeCount, loadJobs]);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => getStatus(j) === filter);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Queue Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {jobs.length} total jobs
            {lastRefresh && (
              <> · Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}</>
            )}
            {activeCount > 0 && (
              <span className="ml-2 text-sky-400">· polling every 8s</span>
            )}
          </p>
        </div>
        <button
          onClick={() => loadJobs()}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg glass border border-border hover:border-primary/30 hover:text-primary transition-all"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 px-6 pt-4 pb-3">
        {STATS.map(s => {
          const count = jobs.filter(j => getStatus(j) === s.status).length;
          return (
            <button
              key={s.status}
              onClick={() => setFilter(filter === s.status ? 'all' : s.status)}
              className={cn(
                'glass-card rounded-xl p-3 text-center transition-all duration-200 hover:border-primary/30',
                filter === s.status && 'border-primary/30 bg-primary/5'
              )}
            >
              <p className={cn('text-2xl font-bold tabular-nums', s.color)}>{count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* Active banner */}
      <AnimatePresence>
        {activeCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-6 mb-3"
          >
            <div className="px-3 py-2 rounded-lg bg-sky-500/5 border border-sky-500/20 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Zap size={11} className="text-sky-400" />
                <p className="text-xs text-sky-400">
                  {activeCount} job{activeCount !== 1 ? 's' : ''} running live
                </p>
              </div>
              <div className="flex-1 h-px bg-sky-500/20" />
              <Loader2 size={11} className="text-sky-400 animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 px-6 pb-3">
        {(['all', 'rs-pending', 'rs-running', 'rs-failed', 'rs-done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'text-xs px-3 py-1 rounded-lg transition-all',
              filter === f
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f === 'all' ? 'All' : JOB_STATUS_LABELS[f as JobStatus]}
          </button>
        ))}
      </div>

      {/* Jobs list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2 min-h-0">
        {isLoading && jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 size={24} className="text-muted-foreground animate-spin" />
            <p className="text-xs text-muted-foreground">Loading jobs…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <CheckCircle2 size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No jobs in this state</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Add a target via Chat Intake to start</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map(job => <JobCard key={job.id} job={job} />)}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
