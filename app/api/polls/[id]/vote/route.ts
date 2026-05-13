import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { createHash, randomUUID } from "crypto";
import { getPollsCollection, getVotesCollection } from "@/lib/mongodb";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }
  const pollId = new ObjectId(id);

  const cookieStore = await cookies();
  if (cookieStore.has(`voted_${id}`)) {
    return NextResponse.json({ error: "Vous avez déjà voté" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.optionIds) || b.optionIds.length === 0) {
    return NextResponse.json({ error: "Aucune option sélectionnée" }, { status: 400 });
  }
  const optionStrs = b.optionIds.filter((x): x is string => typeof x === "string");
  if (optionStrs.length !== b.optionIds.length || optionStrs.some((s) => !ObjectId.isValid(s))) {
    return NextResponse.json({ error: "Option invalide" }, { status: 400 });
  }
  const optionIds = optionStrs.map((s) => new ObjectId(s));

  const polls = await getPollsCollection();
  const poll = await polls.findOne({ _id: pollId });
  if (!poll) {
    return NextResponse.json({ error: "Sondage introuvable" }, { status: 404 });
  }

  const now = new Date();
  if (poll.status !== "open" || poll.expiresAt.getTime() <= now.getTime()) {
    return NextResponse.json({ error: "Sondage clos ou expiré" }, { status: 410 });
  }

  if (poll.type === "single" && optionIds.length !== 1) {
    return NextResponse.json({ error: "Une seule option pour ce sondage" }, { status: 400 });
  }

  const validOptionIds = new Set(poll.options.map((o) => o._id.toHexString()));
  for (const oid of optionIds) {
    if (!validOptionIds.has(oid.toHexString())) {
      return NextResponse.json({ error: "Option inconnue pour ce sondage" }, { status: 400 });
    }
  }
  // Empêcher les doublons côté requête
  const uniqHex = new Set(optionIds.map((o) => o.toHexString()));
  if (uniqHex.size !== optionIds.length) {
    return NextResponse.json({ error: "Doublons d'options" }, { status: 400 });
  }

  const votes = await getVotesCollection();
  const cookieValue = randomUUID();
  const voterCookieId = createHash("sha256").update(cookieValue).digest("hex");

  try {
    await votes.insertOne({
      _id: new ObjectId(),
      pollId,
      optionIds,
      voterCookieId,
      createdAt: now,
    });
  } catch (e) {
    const err = e as { code?: number };
    if (err.code === 11000) {
      return NextResponse.json({ error: "Vote déjà enregistré" }, { status: 409 });
    }
    throw e;
  }

  // Incrément atomique des compteurs sur les options sélectionnées
  const incFields: Record<string, number> = {};
  const arrayFilters: Record<string, ObjectId>[] = [];
  optionIds.forEach((oid, i) => {
    incFields[`options.$[opt${i}].voteCount`] = 1;
    arrayFilters.push({ [`opt${i}._id`]: oid });
  });
  await polls.updateOne(
    { _id: pollId },
    { $inc: incFields } as never,
    { arrayFilters },
  );

  cookieStore.set(`voted_${id}`, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
