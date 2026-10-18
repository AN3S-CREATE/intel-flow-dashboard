import axios from 'axios';
import { Target, Job, Source, Finding, TargetType, TargetStatus, TargetPriority, JobType, JobStatus } from '../types/osint';

const BASE = '/api/taskade';

// ── Projects ──────────────────────────────────────────────
export const PROJECTS = {
  targets: '6oVSzFt1RHFaQZww',
  sources: 'kspNwpB2E66xYuZ2',
  findings: 'ZHhbG34jZp5eBf4n',
  jobs: 'BqSGm5WZhYX5L2Lo',
};

// ── Targets ───────────────────────────────────────────────
export async function fetchTargets(): Promise<Target[]> {
  const { data } = await axios.get(`${BASE}/projects/${PROJECTS.targets}/nodes`);
  return (data.payload?.nodes ?? []).filter((n: Target) => n.parentId === null);
}

export async function createTarget(params: {
  name: string;
  type: TargetType;
  jurisdiction?: string;
  aliases?: string;
  notes?: string;
  priority?: TargetPriority;
}): Promise<void> {
  const now = new Date().toISOString();
  await axios.post(`${BASE}/projects/${PROJECTS.targets}/nodes`, {
    '/text': params.name,
    '/attributes/@tgt01': params.type,
    '/attributes/@tgt02': params.aliases ?? '',
    '/attributes/@tgt03': params.jurisdiction ?? '',
    '/attributes/@tgt04': params.notes ?? '',
    '/attributes/@tgt05': 'st-queued' as TargetStatus,
    '/attributes/@tgt06': params.priority ?? 'pr-medium',
    '/attributes/@tgt07': now,
    '/attributes/@tgt08': now,
  });
}

export async function updateTargetStatus(nodeId: string, status: TargetStatus): Promise<void> {
  await axios.patch(`${BASE}/projects/${PROJECTS.targets}/nodes/${nodeId}`, {
    '/attributes/@tgt05': status,
    '/attributes/@tgt08': new Date().toISOString(),
  });
}

// ── Jobs ──────────────────────────────────────────────────
export async function fetchJobs(): Promise<Job[]> {
  const { data } = await axios.get(`${BASE}/projects/${PROJECTS.jobs}/nodes`);
  return (data.payload?.nodes ?? []).filter((n: Job) => n.parentId === null);
}

export async function createJob(params: {
  targetId: string;
  targetName: string;
  jobType: JobType;
  assignedAgent: string;
  delaySeconds?: number;
}): Promise<void> {
  const typeLabel: Record<JobType, string> = {
    'jt-discovery': 'Discovery', 'jt-scrape': 'Scrape',
    'jt-summarize': 'Summarize', 'jt-crosscheck': 'Cross-check', 'jt-report': 'Report',
  };
  await axios.post(`${BASE}/projects/${PROJECTS.jobs}/nodes`, {
    '/text': `${typeLabel[params.jobType]} — ${params.targetName}`,
    '/attributes/@job01': params.targetId,
    '/attributes/@job02': params.jobType,
    '/attributes/@job03': 'rs-pending' as JobStatus,
    '/attributes/@job05': params.delaySeconds ?? 10,
    '/attributes/@job06': 0,
    '/attributes/@job08': params.assignedAgent,
  });
}

export async function updateJobStatus(nodeId: string, status: JobStatus, error?: string): Promise<void> {
  const body: Record<string, unknown> = { '/attributes/@job03': status };
  if (error) body['/attributes/@job07'] = error;
  await axios.patch(`${BASE}/projects/${PROJECTS.jobs}/nodes/${nodeId}`, body);
}

// ── Sources ───────────────────────────────────────────────
export async function fetchSources(): Promise<Source[]> {
  const { data } = await axios.get(`${BASE}/projects/${PROJECTS.sources}/nodes`);
  return (data.payload?.nodes ?? []).filter((n: Source) => n.parentId === null);
}

// ── Findings ──────────────────────────────────────────────
export async function fetchFindings(): Promise<Finding[]> {
  const { data } = await axios.get(`${BASE}/projects/${PROJECTS.findings}/nodes`);
  return (data.payload?.nodes ?? []).filter((n: Finding) => n.parentId === null);
}

/**
 * Mark a finding as reviewed by writing "Confirmed fact" back to the
 * Findings project node. This removes it from the review inbox on next load.
 */
export async function dismissFinding(nodeId: string): Promise<void> {
  await axios.patch(`${BASE}/projects/${PROJECTS.findings}/nodes/${nodeId}`, {
    '/attributes/@fnd06': 'fva-fact',      // Fact vs Allegation → Confirmed fact
    '/attributes/@fnd04': 'conf-high',     // Confidence → High (human confirmed)
  });
}

/**
 * Clear the "Needs Review" status on a target by moving it back to In Progress.
 */
export async function dismissTargetReview(nodeId: string): Promise<void> {
  await axios.patch(`${BASE}/projects/${PROJECTS.targets}/nodes/${nodeId}`, {
    '/attributes/@tgt05': 'st-inprogress',
    '/attributes/@tgt08': new Date().toISOString(),
  });
}

// ── Agent Chat ────────────────────────────────────────────
// Agent chat is handled entirely by the SDK at @/lib/agent-chat.
// Do NOT add createConversation / sendChatMessage / openChatStream here —
// the SDK exports those and an api.ts duplicate would shadow the SDK version
// (which returns { ok, conversationId } vs. a plain string) causing subtle bugs.
