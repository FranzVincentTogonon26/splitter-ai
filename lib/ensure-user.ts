import { currentUser } from "@clerk/nextjs/server";

import { db } from "@/lib/db";

/**
 * Dev fallback user sync: upserts the signed-in Clerk user into the User table
 * on page load. The Clerk webhook (phase 05) is the production sync path.
 */
export async function ensureUser() {
  const cu = await currentUser();
  if (!cu) return null;

  const email = cu.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) return null;

  const name = cu.fullName ?? cu.firstName ?? "You";
  const imageUrl = cu.imageUrl ?? null;

  return db.user.upsert({
    where: { id: cu.id },
    update: { email, name, imageUrl },
    create: { id: cu.id, email, name, imageUrl },
  });
}