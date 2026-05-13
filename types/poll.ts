import type { ObjectId } from "mongodb";

export type PollType = "single" | "multiple";
export type PollStatus = "open" | "closed";

export interface PollOption {
  _id: ObjectId;
  label: string;
  voteCount: number;
}

export interface Poll {
  _id: ObjectId;
  organizerCookieId: string;
  question: string;
  type: PollType;
  status: PollStatus;
  options: PollOption[];
  createdAt: Date;
  closedAt: Date | null;
  expiresAt: Date;
}

export interface Vote {
  _id: ObjectId;
  pollId: ObjectId;
  optionIds: ObjectId[];
  voterCookieId: string;
  createdAt: Date;
}

export interface PollResultOption {
  optionId: string;
  label: string;
  voteCount: number;
}

export interface PollResultsResponse {
  status: PollStatus;
  totalVotes: number;
  options: PollResultOption[];
}
