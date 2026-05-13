"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PollType } from "@/types/poll";

interface VoteFormProps {
  poll: {
    id: string;
    question: string;
    type: PollType;
    options: { id: string; label: string }[];
    expiresAt: string;
  };
}

export default function VoteForm({ poll }: VoteFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(optionId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (poll.type === "single") {
        next.clear();
        next.add(optionId);
      } else if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selected.size === 0) {
      setError("Sélectionnez au moins une option.");
      return;
    }
    if (poll.type === "single" && selected.size !== 1) {
      setError("Une seule option pour ce sondage.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 409 || res.status === 410) {
          router.push(`/polls/${poll.id}/results`);
          return;
        }
        throw new Error(data.error ?? "Erreur lors du vote");
      }
      router.push(`/polls/${poll.id}/results`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <ul className="space-y-2">
        {poll.options.map((opt) => {
          const isSelected = selected.has(opt.id);
          return (
            <li key={opt.id}>
              <label
                className={
                  "flex cursor-pointer items-center gap-3 rounded-md border bg-white px-4 py-3 text-sm shadow-sm " +
                  (isSelected
                    ? "border-slate-900 ring-1 ring-slate-900"
                    : "border-slate-300 hover:border-slate-400")
                }
              >
                <input
                  type={poll.type === "single" ? "radio" : "checkbox"}
                  name="option"
                  value={opt.id}
                  checked={isSelected}
                  onChange={() => toggle(opt.id)}
                  className="h-4 w-4"
                />
                <span className="text-slate-900">{opt.label}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || selected.size === 0}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? "Envoi..." : "Valider mon vote"}
        </button>
      </div>
    </form>
  );
}
