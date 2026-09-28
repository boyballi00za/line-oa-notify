const STATUS_TEXT = {
  200: "OK",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  429: "Too Many Requests",
  500: "Internal Server Error"
};

// Minimal single-recipient text push, used by the reminders cron. The
// interactive /api/send route builds richer payloads itself (stickers,
// images, quick replies) via lib/linePayload.js.
export async function sendLineTextPush(token, userId, text) {
  const payload = { to: userId, messages: [{ type: "text", text }] };
  const startedAt = Date.now();
  let statusCode = 0;
  let ok = false;
  let responseBody = {};
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    statusCode = res.status;
    ok = res.ok;
    responseBody = await res.json().catch(() => ({}));
  } catch (e) {
    responseBody = { message: e instanceof Error ? e.message : String(e) };
  }
  const ms = Date.now() - startedAt;
  return {
    ok,
    statusCode,
    statusText: `${statusCode || "—"} ${STATUS_TEXT[statusCode] || "Network Error"}`,
    ms,
    payload,
    responseBody
  };
}

// Used by the webhook handler to reply inline to an event. replyToken is
// single-use and expires quickly; failures are logged, never thrown, so the
// webhook still returns 200 to LINE.
export async function sendLineReplyMessages(token, replyToken, messages) {
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ replyToken, messages })
    });
    if (!res.ok) {
      console.error("[webhook] reply failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (e) {
    console.error("[webhook] reply error:", e instanceof Error ? e.message : e);
  }
}
