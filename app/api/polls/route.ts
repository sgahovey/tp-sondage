import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";
import { getPollsCollection } from "@/lib/mongodb";
import { validatePollInput } from "@/lib/poll_validation";
import type { Poll } from "@/types/poll";

export async function POST(request: Request) {
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

  const now = new Date();
  const organizerCookieId = randomUUID();
  const poll: Poll = {
    _id: new ObjectId(),
    organizerCookieId,
    question: result.data.question,
    type: result.data.type,
    status: "open",
    options: result.data.options.map((label) => ({
      _id: new ObjectId(),
      label,
      voteCount: 0,
    })),
    createdAt: now,
    closedAt: null,
    expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
  };

  const polls = await getPollsCollection();
  await polls.insertOne(poll);

  const pollIdHex = poll._id.toHexString();
  const cookieStore = await cookies();
  cookieStore.set(`organizer_${pollIdHex}`, organizerCookieId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ id: pollIdHex }, { status: 201 });
}
