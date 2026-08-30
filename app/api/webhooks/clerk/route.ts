import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { UserWebhookEvent, WebhookEvent } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

import { db } from "@/lib/db";

/** The Clerk user payload for created/updated events (snake_case JSON). */
type UserData = Extract<
  UserWebhookEvent,
  { type: "user.created" | "user.updated" }
>["data"];

/**
 * The ONLY API route in the app: syncs Clerk users into the Prisma User
 * table. Public, but every request is verified with `verifyWebhook` — a
 * request without a valid Standard Webhooks signature never reaches the
 * database. All handlers are idempotent so Clerk's at-least-once retries
 * are always safe to replay.
 */
export async function POST(req: NextRequest) {
  let evt: WebhookEvent;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    // Bad signature, bad secret, malformed body — never process it.
    console.error("[clerk-webhook] verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (evt.type) {
    case "user.created":
    case "user.updated":
      await syncUser(evt.data);
      break;
    case "user.deleted":
      // deleteMany, not delete: the row may already be gone (replayed
      // event, or a user we never synced because they had no email).
      if (evt.data.id) {
        await db.user.deleteMany({ where: { id: evt.data.id } });
      }
      break;
    default:
      // Acknowledge event types we don't sync so Clerk doesn't retry.
      break;
  }

  return Response.json({ received: true });
}

/**
 * Idempotent upsert by Clerk userId. A `user.updated` arriving before its
 * `user.created` (or replayed) just writes the same row twice.
 */
async function syncUser(data: UserData) {
  const email = primaryEmail(data);
  // Phone-only accounts can't be invited to groups by email, so there is
  // nothing to sync — ack the event and move on.
  if (!email) return;

  const name =
    [data.first_name, data.last_name].filter(Boolean).join(" ") || "You";
  const imageUrl = data.image_url || null;

  await db.user.upsert({
    where: { id: data.id },
    update: { email, name, imageUrl },
    create: { id: data.id, email, name, imageUrl },
  });
}

function primaryEmail(data: UserData): string | null {
  const primary =
    data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id,
    ) ?? data.email_addresses[0];
  return primary?.email_address?.toLowerCase() ?? null;
}
