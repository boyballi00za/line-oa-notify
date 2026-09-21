import { NextResponse } from "next/server";
import { buildTargets, buildEndpoint, buildPayload } from "@/lib/linePayload";
import { logDelivery } from "@/lib/deliveryLog";

const STATUS_TEXT = {
  200: "OK",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  429: "Too Many Requests",
  500: "Internal Server Error"
};

export async function POST(request) {
  const fields = await request.json();
  const { mode, singleId, multiIds, type, useQuick } = fields;

  const targets = buildTargets(mode, singleId, multiIds);
  const targetLabel =
    mode === "broadcast"
      ? "all friends"
      : mode === "multi"
        ? `${targets.length} userIds`
        : `${(targets[0] || "—").slice(0, 18)}…`;

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    const result = { ok: false, status: "500 Server misconfigured", ms: 0, body: { message: "LINE_CHANNEL_ACCESS_TOKEN is not set on the server" } };
    return NextResponse.json(result, { status: 500 });
  }

  if (mode !== "broadcast" && targets.length === 0) {
    const result = { ok: false, status: "400 Bad Request", ms: 0, body: { message: "The property, to, is required" } };
    const log = await logDelivery({
      mode, messageType: type, target: "—", ok: false, statusCode: 400, statusText: result.status,
      latencyMs: null, detail: "ไม่มี userId ปลายทาง", payload: null, response: result.body
    });
    return NextResponse.json({ ...result, log }, { status: 400 });
  }

  const endpoint = buildEndpoint(mode);
  const payload = buildPayload(fields);

  const startedAt = Date.now();
  let statusCode = 0;
  let responseBody = {};
  let ok = false;
  try {
    const res = await fetch(`https://api.line.me${endpoint}`, {
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
    statusCode = 0;
    responseBody = { message: e instanceof Error ? e.message : String(e) };
  }
  const ms = Date.now() - startedAt;

  const result = {
    ok,
    status: `${statusCode || "—"} ${STATUS_TEXT[statusCode] || "Network Error"}`,
    ms,
    body: ok ? { sentMessages: targets.length || 1, ...responseBody } : responseBody
  };

  const log = await logDelivery({
    mode,
    messageType: type,
    target: targetLabel,
    ok,
    statusCode,
    statusText: result.status,
    latencyMs: ms,
    detail: ok ? type + (useQuick ? " + quickReply" : "") : responseBody?.message || "request failed",
    payload,
    response: responseBody
  });

  return NextResponse.json({ ...result, log }, { status: ok ? 200 : statusCode || 502 });
}
