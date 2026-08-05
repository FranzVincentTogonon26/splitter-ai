// Mock data for Phase 2 (UI foundation). Replaced by real Prisma queries in
// Phase 3 — the shapes in lib/types.ts stay identical.

import type { GroupDetail, GroupSummary, Member } from "./types";

export const MOCK_CURRENT_USER_ID = "user_mock_you";

const you: Member = {
  id: MOCK_CURRENT_USER_ID,
  name: "You",
  email: "you@example.com",
};
const ben: Member = { id: "user_mock_ben", name: "Ben", email: "ben@example.com" };
const chris: Member = { id: "user_mock_chris", name: "Chris", email: "chris@example.com" };
const dana: Member = { id: "user_mock_dana", name: "Dana", email: "dana@example.com" };

export const mockGroups: GroupSummary[] = [
  {
    id: "grp_goa",
    name: "Goa Trip 🏖️",
    members: [you, ben, chris, dana],
    totalCents: 42_000,
    yourBalanceCents: 23_500,
  },
  {
    id: "grp_apt",
    name: "Apartment 🏠",
    members: [you, ben],
    totalCents: 180_000,
    yourBalanceCents: -45_000,
  },
];

export const mockGroupDetails: Record<string, GroupDetail> = {
  grp_goa: {
    ...mockGroups[0],
    expenses: [
      {
        id: "exp_1",
        description: "Beach shack dinner",
        amountCents: 12_000,
        paidById: you.id,
        createdAt: new Date("2026-07-18T20:00:00Z"),
        splits: [you, ben, chris, dana].map((m) => ({
          userId: m.id,
          amountCents: 3_000,
        })),
      },
      {
        id: "exp_2",
        description: "Scooter rentals",
        amountCents: 8_000,
        paidById: ben.id,
        createdAt: new Date("2026-07-19T09:30:00Z"),
        splits: [you, ben, chris, dana].map((m) => ({
          userId: m.id,
          amountCents: 2_000,
        })),
      },
      {
        id: "exp_3",
        description: "Airbnb",
        amountCents: 22_000,
        paidById: you.id,
        createdAt: new Date("2026-07-17T14:00:00Z"),
        splits: [you, ben, chris, dana].map((m) => ({
          userId: m.id,
          amountCents: 5_500,
        })),
      },
    ],
    // You paid 34,000 of the 42,000 total; each share is 10,500 → net +23,500.
    simplifiedDebts: [
      { fromUserId: chris.id, toUserId: you.id, amountCents: 10_500 },
      { fromUserId: dana.id, toUserId: you.id, amountCents: 10_500 },
      { fromUserId: ben.id, toUserId: you.id, amountCents: 2_500 },
    ],
  },
  grp_apt: {
    ...mockGroups[1],
    expenses: [
      {
        id: "exp_4",
        description: "July rent",
        amountCents: 180_000,
        paidById: ben.id,
        createdAt: new Date("2026-07-01T08:00:00Z"),
        splits: [you, ben].map((m) => ({ userId: m.id, amountCents: 90_000 })),
      },
    ],
    simplifiedDebts: [
      { fromUserId: you.id, toUserId: ben.id, amountCents: 45_000 },
    ],
  },
};
