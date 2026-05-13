import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getPollsCollection } from "@/lib/mongodb";
import type { PollResultsResponse } from "@/types/poll";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }
  const oid = new ObjectId(id);

  const polls = await getPollsCollection();
  const poll = await polls.findOne(
    { _id: oid },
    { projection: { options: 1, status: 1, expiresAt: 1 } },
  );
  if (!poll) {
    return NextResponse.json({ error: "Sondage introuvable" }, { status: 404 });
  }

  // Auto-clôture si expiré (best-effort, ne bloque pas la réponse)
  let effectiveStatus = poll.status;
  if (effectiveStatus === "open" && poll.expiresAt.getTime() <= Date.now()) {
    effectiveStatus = "closed";
    await polls.updateOne(
      { _id: oid, status: "open" },
      { $set: { status: "closed", closedAt: new Date() } },
    );
  }

  const totalVotes = poll.options.reduce((acc, o) => acc + o.voteCount, 0);
  const body: PollResultsResponse = {
    status: effectiveStatus,
    totalVotes,
    options: poll.options.map((o) => ({
      optionId: o._id.toHexString(),
      label: o.label,
      voteCount: o.voteCount,
    })),
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
