import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, MessageSquare, LayoutDashboard, FileText, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

const STORAGE_KEY = 'osint-onboarding-complete';

const STEPS = [
  {
    icon: '🎯',
    title: 'Add a Target',
    description: 'Type a name or company into the Chat Intake. The Intake Agent parses your command and creates a structured target entry.',
    example: 'Add: Acme Corp | type=company | jurisdiction=UK',
    color: 'from-sky-500/20 to-sky-500/5 border-sky-500/30',
    iconColor: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
    dot: 'bg-sky-400',
  },
  {
    icon: '⚙️',
    title: 'Agents Run Automatically',
    description: 'Six specialized AI agents work in sequence — discovering public sources, scraping content, checking legal records, and cross-referencing findings.',
    example: 'Discovery → Scrape → Summarize → Cross-check → Report',
    color: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    iconColor: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    dot: 'bg-purple-400',
  },
  {
    icon: '📋',
    title: 'Review & Export',
    description: 'Low-confidence findings and allegations surface automatically in the Review Inbox. All intelligence is labeled — facts vs. allegations, confidence level, and source.',
    example: 'Target Profile → Findings → Review Inbox',
    color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    iconColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    dot: 'bg-emerald-400',
  },
];

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md z-10"
      >
        <div className="glass-card rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Shield size={13} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Biz Intel · OSINT Runner</p>
                <p className="text-[10px] text-muted-foreground">Getting started</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              <X size={13} />
            </button>
          </div>

          {/* Step content */}
          <div className="p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
              >
                {/* Step card */}
                <div className={cn('rounded-xl bg-gradient-to-br border p-4 mb-4', current.color)}>
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center text-xl shrink-0', current.iconColor)}>
                      {current.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-1">{current.title}</h3>
                      <p className="text-xs text-foreground/70 leading-relaxed">{current.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-[11px] font-mono text-foreground/50">{current.example}</p>
                  </div>
                </div>

                {/* Pipeline mini-map */}
                <div className="flex items-center justify-between gap-1 mb-5">
                  {[
                    { icon: MessageSquare, label: 'Intake', active: step >= 0 },
                    { icon: LayoutDashboard, label: 'Queue', active: step >= 1 },
                    { icon: FileText, label: 'Review', active: step >= 2 },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-center gap-1 flex-1">
                        <div className={cn(
                          'flex flex-col items-center gap-1 flex-1 px-2 py-1.5 rounded-lg border transition-all duration-300',
                          item.active ? 'bg-primary/10 border-primary/20' : 'border-border/50 opacity-40'
                        )}>
                          <Icon size={12} className={item.active ? 'text-primary' : 'text-muted-foreground'} />
                          <span className="text-[9px] text-muted-foreground">{item.label}</span>
                        </div>
                        {i < 2 && (
                          <ArrowRight size={10} className={cn('shrink-0 transition-colors duration-300', item.active && step > i ? 'text-primary' : 'text-border')} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Step dots + button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={cn(
                      'rounded-full transition-all duration-300',
                      i === step ? `w-5 h-1.5 ${s.dot}` : 'w-1.5 h-1.5 bg-border hover:bg-muted-foreground'
                    )}
                  />
                ))}
              </div>
              <button
                onClick={handleNext}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-medium transition-all duration-200',
                  isLast
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'glass border border-border hover:border-primary/30 hover:text-primary'
                )}
              >
                {isLast ? (
                  <><CheckCircle2 size={12} /> Start investigating</>
                ) : (
                  <>Next <ArrowRight size={12} /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Small delay so the app renders first
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  return {
    showOnboarding: show,
    closeOnboarding: () => setShow(false),
    resetOnboarding: () => {
      localStorage.removeItem(STORAGE_KEY);
      setShow(true);
    },
  };
}
