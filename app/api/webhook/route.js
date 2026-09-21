import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

function isValidSignature(rawBody, signature, secret) {
  if (!signature) return false;
  const hash = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  return hash === signature;
}

export async function POST(request) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const rawBody = await request.text();

  if (!secret || !isValidSignature(rawBody, request.headers.get("x-line-signature"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events = Array.isArray(body.events) ? body.events : [];

  const rows = events.map((event) => ({
    event_type: event.type,
    user_id: event.source?.userId || null,
    message_text: event.type === "message" && event.message?.type === "text" ? event.message.text : null
  }));

  if (rows.length) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("webhook_events").insert(rows);
      if (error) console.error("[webhook] insert failed:", error.message);
    } catch (e) {
      console.error("[webhook] error:", e instanceof Error ? e.message : e);
    }
  }

  // LINE requires a fast 200 response regardless of downstream processing.
  return NextResponse.json({ ok: true });
}
