import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getPollsCollection, getVotesCollection } from "@/lib/mongodb";
import { validatePollInput } from "@/lib/poll_validation";

type RouteCtx = { params: Promise<{ id: string }> };

function toObjectId(id: string): ObjectId | null {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const oid = toObjectId(id);
  if (!oid) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const polls = await getPollsCollection();
  const poll = await polls.findOne({ _id: oid });
  if (!poll) return NextResponse.json({ error: "Sondage introuvable" }, { status: 404 });

  const cookieStore = await cookies();
  const organizerCookie = cookieStore.get(`organizer_${id}`);
  const isOrganizer =
    !!organizerCookie && organizerCookie.value === poll.organizerCookieId;
  const hasVoted = cookieStore.has(`voted_${id}`);

  return NextResponse.json({
    id: poll._id.toHexString(),
    question: poll.question,
    type: poll.type,
    status: poll.status,
    options: poll.options.map((o) => ({
      id: o._id.toHexString(),
      label: o.label,
      voteCount: o.voteCount,
    })),
    createdAt: poll.createdAt.toISOString(),
    closedAt: poll.closedAt ? poll.closedAt.toISOString() : null,
    expiresAt: poll.expiresAt.toISOString(),
    isOrganizer,
    hasVoted,
  });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const oid = toObjectId(id);
  if (!oid) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const cookieStore = await cookies();
  const organizerCookie = cookieStore.get(`organizer_${id}`);
  if (!organizerCookie) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const result = validatePollInput(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const polls = await getPollsCollection();
  const poll = await polls.findOne({ _id: oid });
  if (!poll) return NextResponse.json({ error: "Sondage introuvable" }, { status: 404 });
  if (poll.organizerCookieId !== organizerCookie.value) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const votes = await getVotesCollection();
  const voteCount = await votes.countDocuments({ pollId: oid }, { limit: 1 });
  if (voteCount > 0) {
    return NextResponse.json(
      { error: "Impossible de modifier un sondage déjà voté" },
      { status: 403 },
    );
  }

  await polls.updateOne(
    { _id: oid },
    {
      $set: {
        question: result.data.question,
        type: result.data.type,
        options: result.data.options.map((label) => ({
          _id: new ObjectId(),
          label,
          voteCount: 0,
        })),
      },
    },
  );

  return NextResponse.json({ ok: true });
}
