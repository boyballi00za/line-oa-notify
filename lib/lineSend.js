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
