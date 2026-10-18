import React, { useState, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, LayoutDashboard, FileText, AlertTriangle,
  Shield, ChevronLeft, ChevronRight, Cpu, HelpCircle,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { cn } from './lib/utils';
import { ChatIntakeView } from './components/views/ChatIntakeView';
import { QueueDashboardView } from './components/views/QueueDashboardView';
import { TargetProfileView } from './components/views/TargetProfileView';
import { ReviewInboxView } from './components/views/ReviewInboxView';
import { AgentsPanel } from './components/AgentsPanel';
import { OnboardingModal, useOnboarding } from './components/OnboardingModal';
import { useLiveFindings } from './hooks/useLiveFindings';
import type { LiveFinding } from './hooks/useLiveFindings';
import { CATEGORY_LABELS, AGENTS } from './types/osint';

type View = 'intake' | 'queue' | 'profile' | 'review';

const NAV_ITEMS: { id: View; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'intake',  label: 'Chat Intake',    icon: MessageSquare,  description: 'Add & manage targets' },
  { id: 'queue',   label: 'Queue Dashboard', icon: LayoutDashboard, description: 'Job pipeline status' },
  { id: 'profile', label: 'Target Profile',  icon: FileText,       description: 'Intelligence reports' },
  { id: 'review',  label: 'Review Inbox',    icon: AlertTriangle,  description: 'Flags & conflicts' },
];

const CAT_ICON: Record<string, string> = {
  'cat-identity': '🪪', 'cat-roles': '💼', 'cat-ownership': '🏛️',
  'cat-connections': '🔗', 'cat-litigation': '⚖️', 'cat-regulatory': '📋',
  'cat-ethics': '🔍', 'cat-media': '📰',
};

const FVA_LABEL: Record<string, string> = {
  'fva-fact': 'Confirmed fact', 'fva-allegation': 'Alleged', 'fva-unknown': 'Unverified',
};

export default function App() {
  const [activeView, setActiveView] = useState<View>('intake');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [agentsPanelOpen, setAgentsPanelOpen] = useState(true);
  const { showOnboarding, closeOnboarding, resetOnboarding } = useOnboarding();

  const handleHighConfidence = useCallback((f: LiveFinding) => {
    const icon = CAT_ICON[f.category] ?? '🔎';
    const catLabel = CATEGORY_LABELS[f.category] ?? f.category;
    const fvaLabel = FVA_LABEL[f.factOrAllegation] ?? '';
    const summary = f.summary.length > 90 ? f.summary.slice(0, 87) + '…' : f.summary;

    toast.custom(
      (toastId) => (
        <div
          onClick={() => toast.dismiss(toastId)}
          className="group w-80 flex gap-3 cursor-pointer rounded-2xl border border-emerald-500/30 bg-card/95 backdrop-blur-xl shadow-xl shadow-emerald-500/10 p-4 transition-all hover:border-emerald-500/50"
        >
          {/* Icon */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">
              {icon}
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                High Confidence
              </span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{catLabel}</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed">{summary}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                {fvaLabel}
              </span>
              {f.evidenceLinks?.startsWith('http') && (
                <a
                  href={f.evidenceLinks}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-[10px] text-primary/70 hover:text-primary transition-colors underline underline-offset-2 truncate max-w-[120px]"
                >
                  View source
                </a>
              )}
            </div>
          </div>
        </div>
      ),
      {
        duration: 8000,
        position: 'bottom-right',
      }
    );
  }, []);

  const { findings, isPolling, totalCount, fetchError, refresh } = useLiveFindings(handleHighConfidence);

  const activeNav = NAV_ITEMS.find(n => n.id === activeView)!;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Toaster theme="dark" closeButton richColors={false} />

      {/* Onboarding modal */}
      <AnimatePresence>
        {showOnboarding && <OnboardingModal onClose={closeOnboarding} />}
      </AnimatePresence>

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Left Navigation */}
      <aside className={cn(
        'flex flex-col border-r border-border bg-card/50 backdrop-blur-sm transition-all duration-300 shrink-0 z-10',
        sidebarOpen ? 'w-52' : 'w-14'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
            <Shield size={15} className="text-white" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <p className="text-xs font-bold text-foreground whitespace-nowrap">Biz Intel</p>
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">OSINT Runner</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-200 text-left',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon size={15} className="shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.p
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-xs font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.p>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>

        {/* Agent status pip */}
        <div className="p-2 border-t border-border">
          <div className={cn('flex items-center gap-2 px-2.5 py-2 rounded-xl glass border border-border', !sidebarOpen && 'justify-center')}>
            <div className="relative shrink-0">
              <Cpu size={13} className="text-primary" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full border border-background animate-pulse" />
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.p
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-[10px] text-muted-foreground whitespace-nowrap overflow-hidden"
                >
                  {AGENTS.length} agents active
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(s => !s)}
          className="flex items-center justify-center p-3 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/30 backdrop-blur-sm shrink-0">
          <div>
            <h1 className="text-xs font-semibold text-foreground">{activeNav.label}</h1>
            <p className="text-[10px] text-muted-foreground">{activeNav.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/15 rounded-full px-2 py-0.5">
              <Shield size={9} />
              Public sources · No doxxing · Facts labeled
            </div>
            <button
              onClick={resetOnboarding}
              title="How it works"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border transition-all"
            >
              <HelpCircle size={14} />
            </button>
            <button
              onClick={() => setAgentsPanelOpen(s => !s)}
              className={cn(
                'text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5',
                agentsPanelOpen
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'glass border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <Cpu size={11} />
              Agents
            </button>
          </div>
        </header>

        {/* View + agents panel */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <ErrorBoundary
              fallbackRender={({ error, resetErrorBoundary }) => (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xl">⚠️</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Something went wrong</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">{error?.message ?? 'An unexpected error occurred in this view.'}</p>
                  </div>
                  <button
                    onClick={resetErrorBoundary}
                    className="text-xs px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all"
                  >
                    Try again
                  </button>
                </div>
              )}
              resetKeys={[activeView]}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.18 }}
                  className="h-full"
                >
                  {activeView === 'intake'  && (
                    <ChatIntakeView
                      findings={findings}
                      isPolling={isPolling}
                      totalCount={totalCount}
                      fetchError={fetchError}
                      refresh={refresh}
                    />
                  )}
                  {activeView === 'queue'   && <QueueDashboardView />}
                  {activeView === 'profile' && <TargetProfileView />}
                  {activeView === 'review'  && <ReviewInboxView />}
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </div>

          {/* Agents panel — only shown on non-intake views since intake has its own right panel */}
          <AnimatePresence>
            {agentsPanelOpen && activeView !== 'intake' && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 224, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="shrink-0 border-l border-border bg-card/30 backdrop-blur-sm overflow-hidden"
              >
                <div className="w-56 h-full overflow-y-auto p-3">
                  <AgentsPanel />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
