import React from 'react';
import { cn } from '../lib/utils';
import {
  TargetStatus, TargetPriority, JobType, JobStatus, SourceType,
  FindingCategory, ConfidenceLevel, FactAllegation,
  STATUS_LABELS, PRIORITY_LABELS, JOB_TYPE_LABELS, JOB_STATUS_LABELS,
  SOURCE_TYPE_LABELS, CATEGORY_LABELS, CONFIDENCE_LABELS, FVA_LABELS,
} from '../types/osint';

const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium tracking-wide';

export function StatusBadge({ status }: { status: TargetStatus }) {
  const cls: Record<TargetStatus, string> = {
    'st-new': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    'st-queued': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    'st-inprogress': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    'st-review': 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    'st-completed': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    'st-blocked': 'bg-red-500/20 text-red-400 border border-red-500/30',
  };
  return <span className={cn(base, cls[status])}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: TargetPriority }) {
  const cls: Record<TargetPriority, string> = {
    'pr-low': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    'pr-medium': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    'pr-high': 'bg-red-500/20 text-red-400 border border-red-500/30',
  };
  const dot: Record<TargetPriority, string> = {
    'pr-low': 'bg-slate-400', 'pr-medium': 'bg-amber-400', 'pr-high': 'bg-red-400',
  };
  return (
    <span className={cn(base, cls[priority])}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dot[priority])} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function JobTypeBadge({ type }: { type: JobType }) {
  const cls: Record<JobType, string> = {
    'jt-discovery': 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    'jt-scrape': 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    'jt-summarize': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    'jt-crosscheck': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    'jt-report': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  };
  return <span className={cn(base, cls[type])}>{JOB_TYPE_LABELS[type]}</span>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const cls: Record<JobStatus, string> = {
    'rs-pending': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    'rs-running': 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse',
    'rs-done': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    'rs-failed': 'bg-red-500/20 text-red-400 border border-red-500/30',
    'rs-retrying': 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    'rs-skipped': 'bg-slate-500/15 text-slate-500 border border-slate-600/20',
  };
  return <span className={cn(base, cls[status])}>{JOB_STATUS_LABELS[status]}</span>;
}

export function SourceTypeBadge({ type }: { type: SourceType }) {
  const cls: Record<SourceType, string> = {
    'srt-registry': 'bg-indigo-500/20 text-indigo-400',
    'srt-court': 'bg-red-500/20 text-red-400',
    'srt-regulator': 'bg-orange-500/20 text-orange-400',
    'srt-news': 'bg-blue-500/20 text-blue-400',
    'srt-companysite': 'bg-emerald-500/20 text-emerald-400',
    'srt-profile': 'bg-purple-500/20 text-purple-400',
    'srt-other': 'bg-slate-500/20 text-slate-400',
  };
  return <span className={cn(base, cls[type])}>{SOURCE_TYPE_LABELS[type]}</span>;
}

export function CategoryBadge({ category }: { category: FindingCategory }) {
  const cls: Record<FindingCategory, string> = {
    'cat-identity': 'bg-indigo-500/20 text-indigo-400',
    'cat-roles': 'bg-blue-500/20 text-blue-400',
    'cat-ownership': 'bg-amber-500/20 text-amber-400',
    'cat-connections': 'bg-purple-500/20 text-purple-400',
    'cat-litigation': 'bg-red-500/20 text-red-400',
    'cat-regulatory': 'bg-orange-500/20 text-orange-400',
    'cat-ethics': 'bg-pink-500/20 text-pink-400',
    'cat-media': 'bg-emerald-500/20 text-emerald-400',
  };
  return <span className={cn(base, cls[category])}>{CATEGORY_LABELS[category]}</span>;
}

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const cls: Record<ConfidenceLevel, string> = {
    'conf-high': 'bg-emerald-500/20 text-emerald-400',
    'conf-medium': 'bg-amber-500/20 text-amber-400',
    'conf-low': 'bg-red-500/20 text-red-400',
  };
  return <span className={cn(base, cls[level])}>{CONFIDENCE_LABELS[level]}</span>;
}

export function FVABadge({ fva }: { fva: FactAllegation }) {
  const cls: Record<FactAllegation, string> = {
    'fva-fact': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
    'fva-allegation': 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
    'fva-unknown': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  };
  return <span className={cn(base, cls[fva])}>{FVA_LABELS[fva]}</span>;
}

export function TargetTypeBadge({ type }: { type: 'tp-person' | 'tp-company' }) {
  return (
    <span className={cn(base, type === 'tp-person'
      ? 'bg-indigo-500/20 text-indigo-400'
      : 'bg-amber-500/20 text-amber-400')}>
      {type === 'tp-person' ? '👤 Person' : '🏢 Company'}
    </span>
  );
}
