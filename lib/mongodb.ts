import { MongoClient, type Db, type Collection } from "mongodb";
import type { Poll, Vote } from "@/types/poll";

const DB_NAME = "sondage";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoIndexesReady: Promise<void> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (globalThis._mongoClientPromise) return globalThis._mongoClientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI manquante. Définissez-la dans .env.local (dev) ou dans les variables d'environnement Vercel (prod).",
    );
  }
  const promise = new MongoClient(uri).connect();
  if (process.env.NODE_ENV !== "production") {
    globalThis._mongoClientPromise = promise;
  }
  return promise;
}

async function ensureIndexes(db: Db): Promise<void> {
  await db
    .collection<Vote>("votes")
    .createIndex({ pollId: 1, voterCookieId: 1 }, { unique: true });
  await db.collection<Poll>("polls").createIndex({ createdAt: -1 });
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db(DB_NAME);

  if (!globalThis._mongoIndexesReady) {
    globalThis._mongoIndexesReady = ensureIndexes(db);
  }
  await globalThis._mongoIndexesReady;

  return db;
}

export async function getPollsCollection(): Promise<Collection<Poll>> {
  const db = await getDb();
  return db.collection<Poll>("polls");
}

export async function getVotesCollection(): Promise<Collection<Vote>> {
  const db = await getDb();
  return db.collection<Vote>("votes");
}
