"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PollResultsResponse } from "@/types/poll";

const POLL_INTERVAL_MS = 5000;

interface ResultsViewProps {
  pollId: string;
  isOrganizer: boolean;
  initial: PollResultsResponse;
}

export default function ResultsView({
  pollId,
  isOrganizer,
  initial,
}: ResultsViewProps) {
  const [results, setResults] = useState<PollResultsResponse>(initial);
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/polls/${pollId}/results`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as PollResultsResponse;
      setResults(data);
    } catch {
      // Erreur réseau silencieuse : on retentera au prochain tick.
    }
  }, [pollId]);

  useEffect(() => {
    function clear() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    function start() {
      if (intervalRef.current !== null) return;
      intervalRef.current = setInterval(fetchResults, POLL_INTERVAL_MS);
    }

    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        clear();
      } else if (results.status === "open") {
        fetchResults();
        start();
      }
    }

    if (results.status === "open" && document.visibilityState === "visible") {
      start();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchResults, results.status]);

  async function onCopyLink() {
    const url = `${window.location.origin}/polls/${pollId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Impossible de copier le lien automatiquement.");
    }
  }

  async function onClose() {
    if (closing) return;
    setClosing(true);
    setError(null);
    try {
      const res = await fetch(`/api/polls/${pollId}/close`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Erreur lors de la clôture");
      }
      await fetchResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setClosing(false);
    }
  }

  const isClosed = results.status === "closed";
  const total = results.totalVotes;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
              (isClosed
                ? "bg-slate-200 text-slate-700"
                : "bg-emerald-100 text-emerald-800")
            }
          >
            {isClosed ? "Clôturé" : "Ouvert"}
          </span>
          <span className="text-sm text-slate-600">
            {total} vote{total > 1 ? "s" : ""}
          </span>
        </div>

        {isOrganizer && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCopyLink}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? "Lien copié" : "Copier le lien"}
            </button>
            {!isClosed && (
              <button
                type="button"
                onClick={onClose}
                disabled={closing}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {closing ? "Clôture..." : "Clôturer"}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <ul className="space-y-3">
        {results.options.map((opt) => {
          const pct = total > 0 ? Math.round((opt.voteCount / total) * 100) : 0;
          return (
            <li key={opt.optionId} className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-slate-900">{opt.label}</span>
                <span className="shrink-0 text-xs text-slate-600">
                  {opt.voteCount} · {pct}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-slate-900 transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {!isClosed && (
        <p className="text-xs text-slate-500">
          Les résultats se mettent à jour automatiquement toutes les 5 secondes.
        </p>
      )}
    </div>
  );
}
