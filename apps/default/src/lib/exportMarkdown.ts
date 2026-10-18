import type { Target, TargetStatus, TargetPriority, TargetType, FindingCategory, ConfidenceLevel, FactAllegation, SourceType, CredibilityRating } from '../types/osint';
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS, SOURCE_TYPE_LABELS } from '../types/osint';

// ── Types mirrored from TargetProfileView ────────────────────────────────────
export interface ExportFinding {
  id: string;
  targetId: string;
  category: FindingCategory;
  summary: string;
  confidence: ConfidenceLevel;
  evidenceLinks: string;
  factOrAllegation: FactAllegation;
}

export interface ExportSource {
  id: string;
  targetId: string;
  url: string;
  snippet: string;
  sourceType: SourceType;
  credibility: CredibilityRating;
}

// ── Label helpers ─────────────────────────────────────────────────────────────
const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  'conf-high': 'High',
  'conf-medium': 'Medium',
  'conf-low': 'Low',
};

const FVA_LABELS: Record<FactAllegation, string> = {
  'fva-fact': 'Confirmed fact',
  'fva-allegation': 'Alleged',
  'fva-unknown': 'Unverified',
};

const CREDIBILITY_LABELS: Record<CredibilityRating, string> = {
  'cr-high': 'High',
  'cr-medium': 'Medium',
  'cr-low': 'Low',
};

const CATEGORY_ICONS: Record<FindingCategory, string> = {
  'cat-identity': '🪪',
  'cat-roles': '💼',
  'cat-ownership': '🏛️',
  'cat-connections': '🔗',
  'cat-litigation': '⚖️',
  'cat-regulatory': '📋',
  'cat-ethics': '🔍',
  'cat-media': '📰',
};

// ── Target field accessors ────────────────────────────────────────────────────
function tgtName(t: Target)         { return t.fieldValues['/text'] ?? t.text ?? t.id; }
function tgtType(t: Target)         { return (t.fieldValues['/attributes/@tgt01'] ?? 'tp-company') as TargetType; }
function tgtStatus(t: Target)       { return (t.fieldValues['/attributes/@tgt05'] ?? 'st-new') as TargetStatus; }
function tgtPriority(t: Target)     { return (t.fieldValues['/attributes/@tgt06'] ?? 'pr-medium') as TargetPriority; }
function tgtJurisdiction(t: Target) { return t.fieldValues['/attributes/@tgt03'] ?? ''; }
function tgtAliases(t: Target)      { return t.fieldValues['/attributes/@tgt02'] ?? ''; }
function tgtNotes(t: Target)        { return t.fieldValues['/attributes/@tgt04'] ?? ''; }
function tgtCreatedAt(t: Target)    { return t.fieldValues['/attributes/@tgt07'] ?? ''; }

// ── Markdown renderer ─────────────────────────────────────────────────────────
export function buildMarkdownReport(
  target: Target,
  findings: ExportFinding[],
  sources: ExportSource[],
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const name        = tgtName(target);
  const type        = tgtType(target) === 'tp-company' ? 'Company' : 'Person';
  const status      = STATUS_LABELS[tgtStatus(target)];
  const priority    = PRIORITY_LABELS[tgtPriority(target)];
  const jurisdiction = tgtJurisdiction(target);
  const aliases     = tgtAliases(target);
  const notes       = tgtNotes(target);
  const createdRaw  = tgtCreatedAt(target);
  const createdStr  = createdRaw
    ? new Date(createdRaw).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  // Stats
  const highConf   = findings.filter(f => f.confidence === 'conf-high').length;
  const medConf    = findings.filter(f => f.confidence === 'conf-medium').length;
  const lowConf    = findings.filter(f => f.confidence === 'conf-low').length;
  const factCount  = findings.filter(f => f.factOrAllegation === 'fva-fact').length;
  const allegCount = findings.filter(f => f.factOrAllegation === 'fva-allegation').length;
  const unknCount  = findings.filter(f => f.factOrAllegation === 'fva-unknown').length;

  // Group findings by category
  const grouped = findings.reduce((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {} as Record<FindingCategory, ExportFinding[]>);

  const CATEGORY_ORDER: FindingCategory[] = [
    'cat-identity', 'cat-roles', 'cat-ownership', 'cat-connections',
    'cat-litigation', 'cat-regulatory', 'cat-ethics', 'cat-media',
  ];

  const lines: string[] = [];

  // ── Cover ────────────────────────────────────────────────────────────────
  lines.push(`# OSINT Intelligence Report`);
  lines.push(`## ${name}`);
  lines.push('');
  lines.push(`> **Classification:** Public sources only · Allegations clearly labeled · No personal identifiers`);
  lines.push(`> **Generated:** ${dateStr} at ${timeStr} GMT`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Target metadata ──────────────────────────────────────────────────────
  lines.push('## Target Overview');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  lines.push(`| **Name** | ${name} |`);
  lines.push(`| **Type** | ${type} |`);
  lines.push(`| **Status** | ${status} |`);
  lines.push(`| **Priority** | ${priority} |`);
  if (jurisdiction) lines.push(`| **Jurisdiction** | ${jurisdiction} |`);
  if (aliases)      lines.push(`| **Aliases** | ${aliases} |`);
  lines.push(`| **Target created** | ${createdStr} |`);
  lines.push(`| **Report generated** | ${dateStr} |`);
  lines.push('');

  if (notes) {
    lines.push('**Analyst notes:**');
    lines.push('');
    lines.push(`> ${notes.split('\n').join('\n> ')}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // ── Summary statistics ────────────────────────────────────────────────────
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total findings:** ${findings.length}`);
  lines.push(`- **Sources cited:** ${sources.length}`);
  lines.push('');
  lines.push('**Confidence breakdown:**');
  lines.push('');
  lines.push(`| Confidence | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| 🟢 High | ${highConf} |`);
  lines.push(`| 🟡 Medium | ${medConf} |`);
  lines.push(`| 🔴 Low | ${lowConf} |`);
  lines.push('');
  lines.push('**Fact vs. allegation breakdown:**');
  lines.push('');
  lines.push(`| Label | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| ✅ Confirmed facts | ${factCount} |`);
  lines.push(`| ⚠️ Alleged | ${allegCount} |`);
  lines.push(`| ❓ Unverified | ${unknCount} |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Findings by category ─────────────────────────────────────────────────
  lines.push('## Intelligence Findings');
  lines.push('');

  if (findings.length === 0) {
    lines.push('_No findings have been collected for this target yet._');
    lines.push('');
  } else {
    for (const cat of CATEGORY_ORDER) {
      const catFindings = grouped[cat];
      if (!catFindings || catFindings.length === 0) continue;

      const icon = CATEGORY_ICONS[cat];
      const label = CATEGORY_LABELS[cat];
      lines.push(`### ${icon} ${label} (${catFindings.length})`);
      lines.push('');

      for (const f of catFindings) {
        const confLabel = CONFIDENCE_LABELS[f.confidence];
        const fvaLabel  = FVA_LABELS[f.factOrAllegation];
        const confEmoji = f.confidence === 'conf-high' ? '🟢' : f.confidence === 'conf-medium' ? '🟡' : '🔴';
        const fvaEmoji  = f.factOrAllegation === 'fva-fact' ? '✅' : f.factOrAllegation === 'fva-allegation' ? '⚠️' : '❓';

        lines.push(`#### ${confEmoji} ${f.summary.split('\n')[0].slice(0, 100)}`);
        lines.push('');
        lines.push(f.summary);
        lines.push('');
        lines.push(`**Confidence:** ${confLabel} · **Label:** ${fvaEmoji} ${fvaLabel}`);
        if (f.evidenceLinks && f.evidenceLinks.startsWith('http')) {
          lines.push(`**Source:** [${f.evidenceLinks}](${f.evidenceLinks})`);
        }
        lines.push('');
      }
    }
  }

  lines.push('---');
  lines.push('');

  // ── Sources ───────────────────────────────────────────────────────────────
  if (sources.length > 0) {
    lines.push(`## Sources (${sources.length})`);
    lines.push('');

    for (const [i, s] of sources.entries()) {
      const credEmoji = s.credibility === 'cr-high' ? '🟢' : s.credibility === 'cr-medium' ? '🟡' : '🔴';
      lines.push(`**${i + 1}. ${SOURCE_TYPE_LABELS[s.sourceType]}** · ${credEmoji} ${CREDIBILITY_LABELS[s.credibility]} credibility`);
      if (s.url) lines.push(`URL: [${s.url}](${s.url})`);
      if (s.snippet) lines.push(`> ${s.snippet}`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  lines.push('## Disclaimer');
  lines.push('');
  lines.push(
    'This report was generated automatically by the Biz Intel OSINT Runner. ' +
    'All information is sourced exclusively from publicly available records. ' +
    'Allegations are clearly labeled and have not been independently verified. ' +
    'This report does not constitute legal advice. ' +
    'Treat low-confidence findings as unconfirmed leads requiring further investigation.'
  );
  lines.push('');
  lines.push(`---`);
  lines.push(`*Report generated ${dateStr} at ${timeStr} · Biz Intel OSINT Runner*`);

  return lines.join('\n');
}

// ── Download trigger ──────────────────────────────────────────────────────────
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Slug for filename ─────────────────────────────────────────────────────────
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
