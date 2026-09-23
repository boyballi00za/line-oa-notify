import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sendLineReply } from "@/lib/lineSend";

function isValidSignature(rawBody, signature, secret) {
  if (!signature) return false;
  const hash = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  return hash === signature;
}

const GET_USER_ID_ACTION = "action=get_user_id";
const GET_USER_ID_QUICK_REPLY = [
  {
    type: "action",
    action: { type: "postback", label: "ขอ User ID", data: GET_USER_ID_ACTION, displayText: "ขอ User ID ของฉัน" }
  }
];

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

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (token) {
    for (const event of events) {
      if (!event.replyToken || !event.source?.userId) continue;
      if (event.type === "follow") {
        await sendLineReply(
          token,
          event.replyToken,
          `หวัดดีค่ะ 🐣💛 ยินดีต้อนรับเข้าสู่ครอบครัว ThaiTax นะคะ~ หนูเป็นผู้ช่วยตัวน้อยที่จะคอยเตือนเรื่องภาษีให้ค่ะ ✨\n\nUser ID ของคุณคือ: ${event.source.userId}\n\nแค่เปิดแอพ ThaiTax แล้วกดเชื่อมต่อ LINE ไว้ หนูจะรีบมาบอกก่อนถึงกำหนดยื่นภาษีเองเลย ไม่ต้องพิมพ์อะไรเพิ่มนะคะ 🥰`,
          GET_USER_ID_QUICK_REPLY
        );
      } else if (event.type === "postback" && event.postback?.data === GET_USER_ID_ACTION) {
        await sendLineReply(
          token,
          event.replyToken,
          `User ID ของคุณคือ: ${event.source.userId}`,
          GET_USER_ID_QUICK_REPLY
        );
      } else if (event.type === "message") {
        await sendLineReply(
          token,
          event.replyToken,
          "อุ๊ยย~ หนูเป็นแค่บอทตัวจิ๋ว พิมพ์ตอบไม่เก่งค่ะ 🙈💭 ถ้าอยากตั้งค่าการแจ้งเตือนภาษี ไปหากันที่แอพ ThaiTax แล้วกดเชื่อมต่อ LINE ได้เลยนะคะ เดี๋ยวหนูจะแจ้งให้ทันเวลาแน่นอน 📅💕\n\nหรือกดปุ่มด้านล่างถ้าอยากขอ User ID ของตัวเองอีกครั้งค่ะ 👇",
          GET_USER_ID_QUICK_REPLY
        );
      }
    }
  }

  // LINE requires a fast 200 response regardless of downstream processing.
  return NextResponse.json({ ok: true });
}
