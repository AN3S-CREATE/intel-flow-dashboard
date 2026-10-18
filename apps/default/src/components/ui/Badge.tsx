import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses = {
  default: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  muted: 'bg-muted text-muted-foreground border-border',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
};

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md border font-medium',
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {children}
    </span>
  );
}

// Status badge
import type { TargetStatus, TargetPriority, JobStatus, ConfidenceLevel, FactAllegation } from '../../types/osint';
import { STATUS_LABELS, PRIORITY_LABELS, JOB_STATUS_LABELS, CONFIDENCE_LABELS, FVA_LABELS } from '../../types/osint';

const statusVariants: Record<TargetStatus, BadgeProps['variant']> = {
  'st-new': 'muted',
  'st-queued': 'info',
  'st-inprogress': 'warning',
  'st-review': 'warning',
  'st-completed': 'success',
  'st-blocked': 'danger',
};

const priorityVariants: Record<TargetPriority, BadgeProps['variant']> = {
  'pr-low': 'muted',
  'pr-medium': 'warning',
  'pr-high': 'danger',
};

const jobStatusVariants: Record<JobStatus, BadgeProps['variant']> = {
  'rs-pending': 'muted',
  'rs-running': 'info',
  'rs-done': 'success',
  'rs-failed': 'danger',
  'rs-retrying': 'warning',
  'rs-skipped': 'muted',
};

const confidenceVariants: Record<ConfidenceLevel, BadgeProps['variant']> = {
  'conf-high': 'success',
  'conf-medium': 'warning',
  'conf-low': 'danger',
};

const fvaVariants: Record<FactAllegation, BadgeProps['variant']> = {
  'fva-fact': 'success',
  'fva-allegation': 'danger',
  'fva-unknown': 'muted',
};

export function StatusBadge({ status }: { status: TargetStatus }) {
  return <Badge variant={statusVariants[status]} size="sm">{STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TargetPriority }) {
  return <Badge variant={priorityVariants[priority]} size="sm">{PRIORITY_LABELS[priority]}</Badge>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={jobStatusVariants[status]} size="sm">{JOB_STATUS_LABELS[status]}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  return <Badge variant={confidenceVariants[confidence]} size="sm">{CONFIDENCE_LABELS[confidence]}</Badge>;
}

export function FvaBadge({ fva }: { fva: FactAllegation }) {
  return <Badge variant={fvaVariants[fva]} size="sm">{FVA_LABELS[fva]}</Badge>;
}
