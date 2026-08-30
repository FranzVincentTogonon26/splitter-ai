/**
 * Local end-to-end proof for the webhook route (NOT a test suite — this is
 * a one-shot script; run with the dev server up on :3000):
 *
 *   node scripts/verify-webhook-e2e.mjs
 *
 * It signs a `user.created` + `user.updated` + `user.deleted` delivery with
 * a local secret via standardwebhooks (the same lib `verifyWebhook` uses),
 * POSTs them to the running app, and prints what the route did. Also used
 * to prove idempotency (sending the same delivery twice).
 */
import { Webhook } from "standardwebhooks";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.WEBHOOK_SECRET ?? "whsec_55/KW6po7hcsCeqMHciidTlYCdELiyXb";

const wh = new Webhook(SECRET);

function signDelivery(body) {
  const payload = JSON.stringify(body);
  const msgId = `msg_${Math.random().toString(36).slice(2)}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return {
    payload,
    headers: {
      "content-type": "application/json",
      // Clerk deliveries arrive with svix-* headers; verifyWebhook maps
      // them to standard webhook headers internally.
      "svix-id": msgId,
      "svix-timestamp": timestamp,
      "svix-signature": wh.sign(
        msgId,
        new Date(Number(timestamp) * 1000),
        payload,
      ),
    },
  };
}

async function deliver(body, label) {
  const { payload, headers } = signDelivery(body);
  const res = await fetch(`${BASE_URL}/api/webhooks/clerk`, {
    method: "POST",
    headers,
    body: payload,
  });
  console.log(`${label} -> ${res.status} ${await res.text()}`);
}

console.log(`Target: ${BASE_URL}/api/webhooks/clerk`);

// 1. Unsigned → must be rejected
const unsigned = await fetch(`${BASE_URL}/api/webhooks/clerk`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ type: "user.created", data: { id: "user_e2e_1" } }),
});
console.log(`unsigned            -> ${unsigned.status} ${await unsigned.text()}`);

// 2. Signed user.created (id: user_e2e_1)
const created = {
  type: "user.created",
  data: {
    id: "user_e2e_1",
    object: "user",
    first_name: "E2E",
    last_name: "Tester",
    image_url: "https://example.com/avatar.png",
    email_addresses: [
      { id: "email_1", email_address: "E2E@Example.com", verification: null },
    ],
    primary_email_address_id: "email_1",
  },
};
await deliver(created, "signed user.created ");
await deliver(created, "replayed user.created "); // idempotency: same result

// 3. Signed user.updated (name change)
await deliver(
  {
    type: "user.updated",
    data: {
      ...created.data,
      first_name: "Renamed",
      last_name: "Tester",
    },
  },
  "signed user.updated ",
);

// 4. Signed user.deleted
await deliver(
  { type: "user.deleted", data: { object: "user", id: "user_e2e_1", deleted: true } },
  "signed user.deleted ",
);

// 5. Deleted again (replay) → idempotent deleteMany
await deliver(
  { type: "user.deleted", data: { object: "user", id: "user_e2e_1", deleted: true } },
  "replayed user.deleted ",
);
