import type { PollType } from "@/types/poll";

export interface PollInput {
  question: string;
  type: PollType;
  options: string[];
}

export type ValidationResult =
  | { ok: true; data: PollInput }
  | { ok: false; error: string };

export function validatePollInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Corps de requête invalide" };
  }
  const b = body as Record<string, unknown>;

  const question = typeof b.question === "string" ? b.question.trim() : "";
  if (!question) return { ok: false, error: "La question est obligatoire" };
  if (question.length > 280) return { ok: false, error: "Question trop longue (280 max)" };

  if (b.type !== "single" && b.type !== "multiple") {
    return { ok: false, error: "Type invalide" };
  }

  if (!Array.isArray(b.options)) {
    return { ok: false, error: "Liste d'options invalide" };
  }
  const options = b.options
    .filter((o): o is string => typeof o === "string")
    .map((o) => o.trim())
    .filter((o) => o.length > 0 && o.length <= 140);

  if (options.length < 2 || options.length > 10) {
    return { ok: false, error: "Entre 2 et 10 options requises" };
  }

  return { ok: true, data: { question, type: b.type, options } };
}
