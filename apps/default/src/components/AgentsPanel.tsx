import { ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

// All agent IDs confirmed live via /api/taskade discovery
const AGENTS = [
  {
    id: '01KJRSATB7148SQTVSERZKEKV3',
    name: 'Intake Agent',
    emoji: '🎯',
    role: 'Parses commands, creates targets, queues jobs',
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    publicUrl: 'https://www.taskade.com/a/01KJRSATB7148SQTVSERZKEKV3',
  },
  {
    id: '01KJRSB6PFYKDZ9TH0N17R3VK3',
    name: 'Discovery Agent',
    emoji: '🔍',
    role: 'Finds public URLs: registries, regulators, courts',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    publicUrl: 'https://www.taskade.com/a/01KJRSB6PFYKDZ9TH0N17R3VK3',
  },
  {
    id: '01KJRSBK7JS12CW794EAYPY8X7',
    name: 'Scraper Agent',
    emoji: '🕷️',
    role: 'Extracts page content, stores in Sources',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    publicUrl: 'https://www.taskade.com/a/01KJRSBK7JS12CW794EAYPY8X7',
  },
  {
    id: '01KJRSC4F95HBRC85TN443K0G7',
    name: 'Legal & Regulatory Agent',
    emoji: '⚖️',
    role: 'Court & regulator records, labels allegations',
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    publicUrl: 'https://www.taskade.com/a/01KJRSC4F95HBRC85TN443K0G7',
  },
  {
    id: '01KJRSCHKMR7Y816YX55XVZAW1',
    name: 'Cross-check Agent',
    emoji: '🔄',
    role: 'Reconciles sources, flags conflicts',
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    publicUrl: 'https://www.taskade.com/a/01KJRSCHKMR7Y816YX55XVZAW1',
  },
  {
    id: '01KJRSD1ATB7XA720H3Z0SDNFJ',
    name: 'Report Agent',
    emoji: '📊',
    role: 'Generates Target Profile reports',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    publicUrl: 'https://www.taskade.com/a/01KJRSD1ATB7XA720H3Z0SDNFJ',
  },
];

export function AgentsPanel() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Agent Team</p>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          <span className="text-[9px] text-emerald-400">Live</span>
        </div>
      </div>
      {AGENTS.map(agent => (
        <div key={agent.id} className="glass rounded-xl border border-border p-3 hover:border-border/80 transition-all">
          <div className="flex items-start gap-2.5">
            <div className={cn('w-7 h-7 rounded-lg border flex items-center justify-center text-sm shrink-0 relative', agent.color)}>
              {agent.emoji}
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full border border-background" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground truncate">{agent.name}</p>
                <a
                  href={agent.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors ml-1 shrink-0"
                  title={`Chat with ${agent.name}`}
                >
                  <ExternalLink size={11} />
                </a>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{agent.role}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
