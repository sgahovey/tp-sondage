import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getPollsCollection } from "@/lib/mongodb";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }
  const oid = new ObjectId(id);

  const cookieStore = await cookies();
  const organizerCookie = cookieStore.get(`organizer_${id}`);
  if (!organizerCookie) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const polls = await getPollsCollection();
  const poll = await polls.findOne({ _id: oid });
  if (!poll) {
    return NextResponse.json({ error: "Sondage introuvable" }, { status: 404 });
  }
  if (poll.organizerCookieId !== organizerCookie.value) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (poll.status === "closed") {
    return NextResponse.json({ ok: true, alreadyClosed: true });
  }

  await polls.updateOne(
    { _id: oid },
    { $set: { status: "closed", closedAt: new Date() } },
  );
  return NextResponse.json({ ok: true });
}
