import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN is not set on the server" });
  }
  try {
    const res = await fetch("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: body.message || `HTTP ${res.status}` });
    }
    return NextResponse.json({ ok: true, displayName: body.displayName, basicId: body.basicId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
