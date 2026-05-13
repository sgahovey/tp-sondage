import { cookies } from "next/headers";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getPollsCollection } from "@/lib/mongodb";
import VoteForm from "./vote_form";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function PollVotePage({ params }: PageProps) {
  await connection();
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const cookieStore = await cookies();
  if (cookieStore.has(`voted_${id}`)) {
    redirect(`/polls/${id}/results`);
  }

  const polls = await getPollsCollection();
  const poll = await polls.findOne({ _id: new ObjectId(id) });
  if (!poll) notFound();

  // eslint-disable-next-line react-hooks/purity -- connection() ci-dessus opt-out du prerender
  if (poll.status !== "open" || poll.expiresAt.getTime() <= Date.now()) {
    redirect(`/polls/${id}/results`);
  }

  const viewPoll = {
    id: poll._id.toHexString(),
    question: poll.question,
    type: poll.type,
    options: poll.options.map((o) => ({
      id: o._id.toHexString(),
      label: o.label,
    })),
    expiresAt: poll.expiresAt.toISOString(),
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {poll.type === "single" ? "Choix unique" : "Choix multiple"}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        {poll.question}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Votre vote est anonyme et définitif.
      </p>
      <div className="mt-8">
        <VoteForm poll={viewPoll} />
      </div>
    </div>
  );
}
