"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PollType } from "@/types/poll";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

export default function NewPollForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<PollType>("single");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    setOptions((prev) =>
      prev.length >= MAX_OPTIONS ? prev : [...prev, ""],
    );
  }

  function removeOption(index: number) {
    setOptions((prev) =>
      prev.length <= MIN_OPTIONS ? prev : prev.filter((_, i) => i !== index),
    );
  }

  const cleanedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
  const canSubmit =
    question.trim().length > 0 &&
    cleanedOptions.length >= MIN_OPTIONS &&
    cleanedOptions.length <= MAX_OPTIONS &&
    !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          type,
          options: cleanedOptions,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Erreur lors de la création");
      }
      const data = (await res.json()) as { id: string };
      router.push(`/polls/${data.id}/results`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label htmlFor="question" className="block text-sm font-medium text-slate-700">
          Question
        </label>
        <input
          id="question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={280}
          required
          placeholder="Quel sujet aborder en priorité ?"
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-slate-700">Type de vote</legend>
        <div className="mt-2 flex gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="type"
              value="single"
              checked={type === "single"}
              onChange={() => setType("single")}
            />
            Choix unique
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="type"
              value="multiple"
              checked={type === "multiple"}
              onChange={() => setType("multiple")}
            />
            Choix multiple
          </label>
        </div>
      </fieldset>

      <div>
        <div className="flex items-center justify-between">
          <span className="block text-sm font-medium text-slate-700">
            Options ({cleanedOptions.length}/{MAX_OPTIONS})
          </span>
          <button
            type="button"
            onClick={addOption}
            disabled={options.length >= MAX_OPTIONS}
            className="text-sm font-medium text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            + Ajouter une option
          </button>
        </div>
        <ul className="mt-2 space-y-2">
          {options.map((value, index) => (
            <li key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => updateOption(index, e.target.value)}
                maxLength={140}
                placeholder={`Option ${index + 1}`}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
              <button
                type="button"
                onClick={() => removeOption(index)}
                disabled={options.length <= MIN_OPTIONS}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                aria-label="Supprimer cette option"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Entre {MIN_OPTIONS} et {MAX_OPTIONS} options.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? "Création..." : "Créer le sondage"}
        </button>
      </div>
    </form>
  );
}
