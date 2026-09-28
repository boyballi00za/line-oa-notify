import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sendLineReplyMessages } from "@/lib/lineSend";
import {
  ACTIONS,
  parsePostbackAction,
  textMessage,
  insurancePickerMessage,
  remindersListMessage,
  thaitaxUrl
} from "@/lib/lineMenu";

function isValidSignature(rawBody, signature, secret) {
  if (!signature) return false;
  const hash = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  return hash === signature;
}

function bangkokTodayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

function daysUntil(dueDateStr, todayStr) {
  return Math.round((new Date(`${dueDateStr}T00:00:00Z`) - new Date(`${todayStr}T00:00:00Z`)) / 86400000);
}

async function myRemindersMessage(userId) {
  const today = bangkokTodayStr();
  const { data, count, error } = await getSupabase()
    .from("reminders")
    .select("title, due_date", { count: "exact" })
    .eq("user_id", userId)
    .eq("active", true)
    .gte("due_date", today)
    .order("due_date", { ascending: true })
    .limit(5);

  if (error) {
    console.error("[webhook] reminders lookup failed:", error.message);
    return textMessage("ขอโทษค่ะ ตอนนี้หนูดึงรายการแจ้งเตือนไม่ได้ ลองใหม่อีกครั้งนะคะ 🙏");
  }
  if (!data || data.length === 0) {
    return textMessage(
      `ตอนนี้ยังไม่มีการแจ้งเตือนเลยค่ะ 🌱\nเปิดแอพ ThaiTax แล้วตั้งเตือนได้ที่นี่นะคะ 👉 ${thaitaxUrl({ tab: "reminders" })}`
    );
  }
  const rows = data.map((r) => ({ ...r, daysLeft: daysUntil(r.due_date, today) }));
  return remindersListMessage(rows, count ?? rows.length);
}

function userIdMessage(userId) {
  return textMessage(`User ID ของคุณคือ:\n${userId}`);
}

function welcomeMessage(userId) {
  return textMessage(
    `หวัดดีค่ะ 🐣💛 ยินดีต้อนรับเข้าสู่ครอบครัว ThaiTax นะคะ~ หนูเป็นผู้ช่วยตัวน้อยที่จะคอยเตือนเรื่องภาษีให้ค่ะ ✨\n\n` +
      `User ID ของคุณคือ: ${userId}\n\n` +
      `แค่เปิดแอพ ThaiTax แล้วกดเชื่อมต่อ LINE ไว้ หนูจะรีบมาบอกก่อนถึงกำหนดยื่นภาษีเองเลย ` +
      `อยากบันทึกประกันหรือดูการแจ้งเตือน กดเมนูด้านล่างได้เลยนะคะ 👇`
  );
}

function fallbackMessage() {
  return textMessage(
    "อุ๊ยย~ หนูเป็นแค่บอทตัวจิ๋ว พิมพ์ตอบไม่เก่งค่ะ 🙈💭\nลองกดเมนูด้านล่าง หรือพิมพ์ว่า \"ประกัน\" / \"แจ้งเตือน\" ได้เลยนะคะ 👇"
  );
}

// Free-text shortcuts so typing works as well as tapping the menu.
function actionForText(text) {
  const t = (text || "").trim().toLowerCase();
  if (t.includes("ประกัน")) return ACTIONS.insuranceMenu;
  if (t.includes("แจ้งเตือน") || t.includes("เตือน")) return ACTIONS.myReminders;
  if (/user\s*id|userid|ไอดี/.test(t)) return ACTIONS.getUserId;
  return null;
}

async function replyFor(action, userId) {
  if (action === ACTIONS.insuranceMenu) return insurancePickerMessage();
  if (action === ACTIONS.myReminders) return myRemindersMessage(userId);
  if (action === ACTIONS.getUserId) return userIdMessage(userId);
  return null;
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
    message_text:
      event.type === "message" && event.message?.type === "text"
        ? event.message.text
        : event.type === "postback"
          ? event.postback?.data || null
          : null
  }));

  if (rows.length) {
    try {
      const { error } = await getSupabase().from("webhook_events").insert(rows);
      if (error) console.error("[webhook] insert failed:", error.message);
    } catch (e) {
      console.error("[webhook] error:", e instanceof Error ? e.message : e);
    }
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (token) {
    for (const event of events) {
      const userId = event.source?.userId;
      if (!event.replyToken || !userId) continue;

      let message = null;
      if (event.type === "follow") {
        message = welcomeMessage(userId);
      } else if (event.type === "postback") {
        message = await replyFor(parsePostbackAction(event.postback?.data), userId);
      } else if (event.type === "message") {
        const action = event.message?.type === "text" ? actionForText(event.message.text) : null;
        message = (await replyFor(action, userId)) || fallbackMessage();
      }

      if (message) await sendLineReplyMessages(token, event.replyToken, [message]);
    }
  }

  // LINE requires a fast 200 response regardless of downstream processing.
  return NextResponse.json({ ok: true });
}
