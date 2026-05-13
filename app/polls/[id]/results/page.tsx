import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getPollsCollection } from "@/lib/mongodb";
import type { PollResultsResponse } from "@/types/poll";
import ResultsView from "./results_view";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function ResultsPage({ params }: PageProps) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const polls = await getPollsCollection();
  const poll = await polls.findOne({ _id: new ObjectId(id) });
  if (!poll) notFound();

  const cookieStore = await cookies();
  const organizerCookie = cookieStore.get(`organizer_${id}`);
  const isOrganizer =
    !!organizerCookie && organizerCookie.value === poll.organizerCookieId;

  const initialResults: PollResultsResponse = {
    status: poll.status,
    totalVotes: poll.options.reduce((acc, o) => acc + o.voteCount, 0),
    options: poll.options.map((o) => ({
      optionId: o._id.toHexString(),
      label: o.label,
      voteCount: o.voteCount,
    })),
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {poll.type === "single" ? "Choix unique" : "Choix multiple"}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        {poll.question}
      </h1>
      <div className="mt-8">
        <ResultsView
          pollId={id}
          isOrganizer={isOrganizer}
          initial={initialResults}
        />
      </div>
    </div>
  );
}
