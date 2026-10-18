import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, Loader2, Target, Layers, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface FeedEvent {
  id: string;
  type: 'target_created' | 'job_queued' | 'processing' | 'done';
  title: string;
  subtitle?: string;
  timestamp: Date;
}

interface Props {
  events: FeedEvent[];
  onDismiss: (id: string) => void;
}

const ICON_MAP: Record<FeedEvent['type'], React.ElementType> = {
  target_created: Target,
  job_queued: Layers,
  processing: Loader2,
  done: CheckCircle2,
};

const COLOR_MAP: Record<FeedEvent['type'], string> = {
  target_created: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
  job_queued: 'text-violet-400 bg-violet-500/15 border-violet-500/30',
  processing: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  done: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
};

export default function LiveFeed({ events, onDismiss }: Props) {
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    events.forEach(ev => {
      if (!timerRefs.current.has(ev.id)) {
        const t = setTimeout(() => onDismiss(ev.id), 8000);
        timerRefs.current.set(ev.id, t);
      }
    });
    return () => {};
  }, [events, onDismiss]);

  if (events.length === 0) return null;

  return (
    <div className="fixed bottom-12 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {events.map(ev => {
          const Icon = ICON_MAP[ev.type];
          const colors = COLOR_MAP[ev.type];
          const isSpinning = ev.type === 'processing';

          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-auto"
            >
              <div className={cn(
                'flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-2xl shadow-black/40',
                'glass-card backdrop-blur-xl min-w-[280px] max-w-[320px]',
                colors
              )}>
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border',
                  colors
                )}>
                  <Icon className={cn('w-3.5 h-3.5', isSpinning && 'animate-spin')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{ev.title}</p>
                  {ev.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{ev.subtitle}</p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {ev.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => onDismiss(ev.id)}
                  className="text-muted-foreground/50 hover:text-muted-foreground shrink-0 mt-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
