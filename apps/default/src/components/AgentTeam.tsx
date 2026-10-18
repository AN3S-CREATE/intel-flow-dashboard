import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, CheckCircle } from 'lucide-react';
import { AGENTS } from '../types/osint';
import { cn } from '../lib/utils';

export default function AgentTeam() {
  return (
    <div className="p-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">
        Agent Team
      </p>
      {AGENTS.map((agent, i) => (
        <motion.div
          key={agent.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="glass rounded-xl border border-border/40 p-3 group hover:border-border transition-all"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center text-sm shrink-0">
              {agent.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className={cn('text-xs font-semibold', agent.color)}>{agent.name}</p>
                <CheckCircle className="w-3 h-3 text-emerald-500 opacity-70" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{agent.description}</p>
            </div>
          </div>
        </motion.div>
      ))}
      <div className="pt-2 px-1">
        <a
          href="https://www.taskade.com/spaces/hv365gb7b4ztxkpr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Manage in Taskade
        </a>
      </div>
    </div>
  );
}
