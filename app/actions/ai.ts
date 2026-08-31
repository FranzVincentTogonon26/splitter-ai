"use server";

import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import {
  AI_INPUT_LIMIT,
  AI_PARSE_PROMPT,
  ParsedExpenseSchema,
  sanitizeParsedExpense,
} from "@/lib/ai";

export type ParseExpenseState =
  | { ok: true; description: string; amount: string; currency: string }
  | { ok: false; error: string };

/**
 * AI quick-add: free text in, one validated {description, amount, currency}
 * out. The model never does money math — lib/ai.ts validates and rounds to
 * integer cents; the modal receives display-ready strings and the normal
 * addExpense path re-validates everything server-side.
 *
 * Degrades gracefully: without ANTHROPIC_API_KEY (or on any model/network
 * failure) it returns an error string and the user enters the expense
 * manually. Secrets stay server-side — nothing here is exported to client
 * code except the parsed result.
 */
export async function parseExpenseText(
  text: string,
): Promise<ParseExpenseState> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Type something first" };
  if (trimmed.length > AI_INPUT_LIMIT) {
    return { ok: false, error: "Too long — describe one expense" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI quick-add unavailable — enter it manually" };
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.parse({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      messages: [
        { role: "user", content: `${AI_PARSE_PROMPT}\n\n${trimmed}` },
      ],
      output_config: { format: zodOutputFormat(ParsedExpenseSchema) },
    });

    const result = sanitizeParsedExpense(message.parsed_output);
    if (!result.ok) {
      return { ok: false, error: "Couldn't read that — enter it manually" };
    }
    return {
      ok: true,
      description: result.description,
      amount: (result.amountCents / 100).toString(),
      currency: result.currency,
    };
  } catch {
    return { ok: false, error: "AI quick-add failed — enter it manually" };
  }
}