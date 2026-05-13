import Link from "next/link";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getPollsCollection } from "@/lib/mongodb";
import type { Poll } from "@/types/poll";

export const dynamic = "force-dynamic";

interface MyPollSummary {
  id: string;
  question: string;
  status: "open" | "closed";
  totalVotes: number;
  optionCount: number;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
}

async function getMyPolls(): Promise<MyPollSummary[]> {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();

  const organizerEntries = all
    .filter((c) => c.name.startsWith("organizer_"))
    .map((c) => ({ pollId: c.name.slice("organizer_".length), uuid: c.value }))
    .filter((e) => ObjectId.isValid(e.pollId));

  if (organizerEntries.length === 0) return [];

  const oids = organizerEntries.map((e) => new ObjectId(e.pollId));
  const polls = await getPollsCollection();
  const docs = await polls
    .find({ _id: { $in: oids } })
    .sort({ createdAt: -1 })
    .toArray();

  const validById = new Map<string, Poll>();
  for (const doc of docs) {
    const entry = organizerEntries.find((e) => e.pollId === doc._id.toHexString());
    if (entry && entry.uuid === doc.organizerCookieId) {
      validById.set(doc._id.toHexString(), doc);
    }
  }

  const now = Date.now();
  return Array.from(validById.values()).map((poll) => {
    const totalVotes = poll.options.reduce((acc, o) => acc + o.voteCount, 0);
    return {
      id: poll._id.toHexString(),
      question: poll.question,
      status: poll.status,
      totalVotes,
      optionCount: poll.options.length,
      createdAt: poll.createdAt.toISOString(),
      expiresAt: poll.expiresAt.toISOString(),
      expired: poll.expiresAt.getTime() <= now,
    };
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HomePage() {
  const myPolls = await getMyPolls();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <section className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mes sondages</h1>
          <p className="mt-1 text-sm text-slate-600">
            Créez un sondage instantané et partagez le lien à votre équipe.
          </p>
        </div>
        <Link
          href="/polls/new"
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Créer un sondage
        </Link>
      </section>

      <section className="mt-8">
        {myPolls.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">
              Aucun sondage pour le moment. Créez votre premier sondage pour démarrer.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {myPolls.map((p) => {
              const closedOrExpired = p.status === "closed" || p.expired;
              return (
                <li
                  key={p.id}
                  className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-slate-900">
                        {p.question}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Créé le {formatDate(p.createdAt)} ·{" "}
                        {p.optionCount} options · {p.totalVotes} vote
                        {p.totalVotes > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                          (closedOrExpired
                            ? "bg-slate-200 text-slate-700"
                            : "bg-emerald-100 text-emerald-800")
                        }
                      >
                        {closedOrExpired ? "Clôturé" : "Ouvert"}
                      </span>
                      <Link
                        href={`/polls/${p.id}/results`}
                        className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Résultats
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
