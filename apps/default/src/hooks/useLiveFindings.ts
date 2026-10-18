import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchFindings } from '../services/api';
import type { Finding, FindingCategory, ConfidenceLevel, FactAllegation } from '../types/osint';

// Flattened, UI-ready finding derived from the raw Finding fieldValues shape
export interface LiveFinding {
  id: string;
  targetId: string;
  category: FindingCategory;
  summary: string;
  confidence: ConfidenceLevel;
  evidenceLinks: string;
  factOrAllegation: FactAllegation;
  arrivedAt: Date;
  isNew: boolean;
}

function toFlat(f: Finding): LiveFinding | null {
  const fv = f.fieldValues;
  const summary = fv['/attributes/@fnd03'] ?? fv['/text'] ?? f.text ?? '';
  if (!summary.trim()) return null; // skip empty shell nodes
  return {
    id: f.id,
    targetId: fv['/attributes/@fnd01'] ?? '',
    category: (fv['/attributes/@fnd02'] as FindingCategory) ?? 'cat-identity',
    summary,
    confidence: (fv['/attributes/@fnd04'] as ConfidenceLevel) ?? 'conf-low',
    evidenceLinks: fv['/attributes/@fnd05'] ?? '',
    factOrAllegation: (fv['/attributes/@fnd06'] as FactAllegation) ?? 'fva-unknown',
    arrivedAt: new Date(),
    isNew: false,
  };
}

const POLL_INTERVAL = 8000;
// Only surface an error after this many consecutive failures (avoids transient flicker)
const ERROR_THRESHOLD = 2;

export function useLiveFindings(onNewHighConfidence?: (f: LiveFinding) => void) {
  const [findings, setFindings] = useState<LiveFinding[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const consecutiveErrors = useRef(0);
  const seenIds = useRef<Set<string>>(new Set());
  const newIdTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Guard: prevent concurrent fetchFindings calls from the interval + refresh() timers racing
  const isFetchingRef = useRef(false);
  // Keep callback stable without re-creating poll
  const callbackRef = useRef(onNewHighConfidence);
  useEffect(() => { callbackRef.current = onNewHighConfidence; }, [onNewHighConfidence]);

  const poll = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsPolling(true);
    try {
      const rawResult = await fetchFindings();
      const raw = Array.isArray(rawResult) ? rawResult : [];

      // Success — clear any error state
      consecutiveErrors.current = 0;
      setFetchError(null);

      const incoming: LiveFinding[] = [];
      const freshHighConf: LiveFinding[] = [];

      for (const f of raw) {
        const flat = toFlat(f);
        if (!flat) continue;
        const isNew = !seenIds.current.has(flat.id);
        if (isNew) {
          seenIds.current.add(flat.id);
          if (flat.confidence === 'conf-high') freshHighConf.push({ ...flat, isNew: true });
        }
        incoming.push({ ...flat, isNew });
      }

      setTotalCount(incoming.length);

      setFindings(prev => {
        const map = new Map(prev.map(f => [f.id, f]));
        for (const f of incoming) {
          if (!map.has(f.id)) {
            map.set(f.id, f);
          } else {
            map.set(f.id, { ...map.get(f.id)!, isNew: false });
          }
        }
        return [...map.values()]
          .sort((a, b) => b.arrivedAt.getTime() - a.arrivedAt.getTime())
          .slice(0, 40);
      });

      // Fire toast callbacks for genuinely new high-confidence findings
      for (const f of freshHighConf) {
        callbackRef.current?.(f);
      }

      // Auto-clear isNew after 4 s
      for (const f of incoming.filter(f => f.isNew)) {
        if (newIdTimers.current.has(f.id)) continue;
        const t = setTimeout(() => {
          setFindings(prev => prev.map(p => p.id === f.id ? { ...p, isNew: false } : p));
          newIdTimers.current.delete(f.id);
        }, 4000);
        newIdTimers.current.set(f.id, t);
      }
    } catch (err) {
      consecutiveErrors.current += 1;
      // Only surface the error after sustained failures so transient blips don't alarm users
      if (consecutiveErrors.current >= ERROR_THRESHOLD) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch findings';
        setFetchError(msg.includes('fetch') ? 'Could not reach the server — retrying…' : msg);
      }
    } finally {
      isFetchingRef.current = false;
      setIsPolling(false);
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      clearInterval(interval);
      newIdTimers.current.forEach(t => clearTimeout(t));
    };
  }, [poll]);

  const refresh = useCallback(() => {
    setTimeout(poll, 2500);
    setTimeout(poll, 6000);
  }, [poll]);

  return { findings, isPolling, totalCount, fetchError, refresh };
}
