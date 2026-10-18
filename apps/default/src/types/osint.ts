export type TargetType = 'tp-person' | 'tp-company';
export type TargetStatus = 'st-new' | 'st-queued' | 'st-inprogress' | 'st-review' | 'st-completed' | 'st-blocked';
export type TargetPriority = 'pr-low' | 'pr-medium' | 'pr-high';

export interface Target {
  id: string;
  text: string;
  parentId: string | null;
  fieldValues: {
    '/attributes/@tgt01'?: TargetType;
    '/attributes/@tgt02'?: string;
    '/attributes/@tgt03'?: string;
    '/attributes/@tgt04'?: string;
    '/attributes/@tgt05'?: TargetStatus;
    '/attributes/@tgt06'?: TargetPriority;
    '/attributes/@tgt07'?: string;
    '/attributes/@tgt08'?: string;
    '/text'?: string;
  };
}

export type JobType = 'jt-discovery' | 'jt-scrape' | 'jt-summarize' | 'jt-crosscheck' | 'jt-report';
export type JobStatus = 'rs-pending' | 'rs-running' | 'rs-done' | 'rs-failed' | 'rs-retrying' | 'rs-skipped';

export interface Job {
  id: string;
  text: string;
  parentId: string | null;
  fieldValues: {
    '/attributes/@job01'?: string;
    '/attributes/@job02'?: JobType;
    '/attributes/@job03'?: JobStatus;
    '/attributes/@job04'?: string;
    '/attributes/@job05'?: number;
    '/attributes/@job06'?: number;
    '/attributes/@job07'?: string;
    '/attributes/@job08'?: string;
    '/text'?: string;
  };
}

export type SourceType = 'srt-registry' | 'srt-court' | 'srt-regulator' | 'srt-news' | 'srt-companysite' | 'srt-profile' | 'srt-other';
export type CredibilityRating = 'cr-high' | 'cr-medium' | 'cr-low';

export interface Source {
  id: string;
  text: string;
  parentId: string | null;
  fieldValues: {
    '/attributes/@src01'?: string;
    '/attributes/@src02'?: string;
    '/attributes/@src03'?: SourceType;
    '/attributes/@src04'?: string;
    '/attributes/@src05'?: string;
    '/attributes/@src06'?: CredibilityRating;
    '/attributes/@src07'?: string;
    '/text'?: string;
  };
}

export type FindingCategory = 'cat-identity' | 'cat-roles' | 'cat-ownership' | 'cat-connections' | 'cat-litigation' | 'cat-regulatory' | 'cat-ethics' | 'cat-media';
export type ConfidenceLevel = 'conf-high' | 'conf-medium' | 'conf-low';
export type FactAllegation = 'fva-fact' | 'fva-allegation' | 'fva-unknown';

export interface Finding {
  id: string;
  text: string;
  parentId: string | null;
  fieldValues: {
    '/attributes/@fnd01'?: string;
    '/attributes/@fnd02'?: FindingCategory;
    '/attributes/@fnd03'?: string;
    '/attributes/@fnd04'?: ConfidenceLevel;
    '/attributes/@fnd05'?: string;
    '/attributes/@fnd06'?: FactAllegation;
    '/attributes/@fnd07'?: string;
    '/text'?: string;
  };
}

export type AppView = 'intake' | 'queue' | 'targets' | 'review';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const AGENTS: AgentConfig[] = [
  { id: '01KJRSATB7148SQTVSERZKEKV3', name: 'Intake Agent', icon: '🎯', description: 'Parses commands, creates targets, queues jobs', color: 'text-sky-400' },
  { id: '01KJRSB6PFYKDZ9TH0N17R3VK3', name: 'Discovery Agent', icon: '🔍', description: 'Finds official public sources', color: 'text-violet-400' },
  { id: '01KJRSBK7JS12CW794EAYPY8X7', name: 'Scraper Agent', icon: '🕷️', description: 'Extracts and stores page content', color: 'text-amber-400' },
  { id: '01KJRSC4F95HBRC85TN443K0G7', name: 'Legal & Regulatory Agent', icon: '⚖️', description: 'Court records and regulatory actions', color: 'text-red-400' },
  { id: '01KJRSCHKMR7Y816YX55XVZAW1', name: 'Cross-check Agent', icon: '🔄', description: 'Reconciles conflicts, flags for review', color: 'text-orange-400' },
  { id: '01KJRSD1ATB7XA720H3Z0SDNFJ', name: 'Report Agent', icon: '📊', description: 'Generates structured target profiles', color: 'text-emerald-400' },
];

export const STATUS_LABELS: Record<TargetStatus, string> = {
  'st-new': 'New', 'st-queued': 'Queued', 'st-inprogress': 'In Progress',
  'st-review': 'Needs Review', 'st-completed': 'Completed', 'st-blocked': 'Blocked',
};
export const PRIORITY_LABELS: Record<TargetPriority, string> = {
  'pr-low': 'Low', 'pr-medium': 'Medium', 'pr-high': 'High',
};
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  'jt-discovery': 'Discovery', 'jt-scrape': 'Scrape', 'jt-summarize': 'Summarize',
  'jt-crosscheck': 'Cross-check', 'jt-report': 'Report',
};
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  'rs-pending': 'Pending', 'rs-running': 'Running', 'rs-done': 'Done',
  'rs-failed': 'Failed', 'rs-retrying': 'Retrying', 'rs-skipped': 'Skipped',
};
export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  'srt-registry': 'Registry', 'srt-court': 'Court', 'srt-regulator': 'Regulator',
  'srt-news': 'News', 'srt-companysite': 'Company Site', 'srt-profile': 'Profile', 'srt-other': 'Other',
};
export const CATEGORY_LABELS: Record<FindingCategory, string> = {
  'cat-identity': 'Identity', 'cat-roles': 'Roles', 'cat-ownership': 'Ownership',
  'cat-connections': 'Connections', 'cat-litigation': 'Litigation', 'cat-regulatory': 'Regulatory',
  'cat-ethics': 'Ethics', 'cat-media': 'Media',
};
export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  'conf-high': 'High', 'conf-medium': 'Medium', 'conf-low': 'Low',
};
export const FVA_LABELS: Record<FactAllegation, string> = {
  'fva-fact': 'Fact', 'fva-allegation': 'Allegation', 'fva-unknown': 'Unknown',
};
