import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sendLineTextPush } from "@/lib/lineSend";
import { logDelivery } from "@/lib/deliveryLog";

function bangkokTodayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

function daysUntil(dueDateStr, todayStr) {
  const due = new Date(`${dueDateStr}T00:00:00Z`);
  const today = new Date(`${todayStr}T00:00:00Z`);
  return Math.round((due - today) / 86400000);
}

function renderTemplate(template, vars) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (key in vars ? String(vars[key]) : ""));
}

// Runs daily via Vercel Cron (see vercel.json). For every active reminder
// whose due date is exactly N days out — where N is one of the reminder's
// remind_before_days — sends the notification once, tracked in
// reminder_sends so a reminder is never double-sent for the same offset.
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "LINE_CHANNEL_ACCESS_TOKEN is not set on the server" }, { status: 500 });
  }

  const supabase = getSupabase();
  const today = bangkokTodayStr();

  const { data: reminders, error } = await supabase.from("reminders").select("*").eq("active", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];

  for (const reminder of reminders || []) {
    const daysLeft = daysUntil(reminder.due_date, today);
    const dueToday = Array.isArray(reminder.remind_before_days) && reminder.remind_before_days.includes(daysLeft);
    if (!dueToday) continue;

    const { data: existing } = await supabase
      .from("reminder_sends")
      .select("id")
      .eq("reminder_id", reminder.id)
      .eq("days_before", daysLeft)
      .maybeSingle();
    if (existing) continue;

    const text = renderTemplate(reminder.message_template, {
      title: reminder.title,
      due_date: reminder.due_date,
      days_left: daysLeft
    });

    const sendResult = await sendLineTextPush(token, reminder.user_id, text);

    await logDelivery({
      mode: "single",
      messageType: "text",
      target: `${reminder.user_id.slice(0, 18)}…`,
      ok: sendResult.ok,
      statusCode: sendResult.statusCode,
      statusText: sendResult.statusText,
      latencyMs: sendResult.ms,
      detail: sendResult.ok ? `reminder: ${reminder.title} (${daysLeft}d)` : sendResult.responseBody?.message || "reminder send failed",
      payload: sendResult.payload,
      response: sendResult.responseBody
    });

    if (sendResult.ok) {
      await supabase.from("reminder_sends").insert({ reminder_id: reminder.id, days_before: daysLeft });
    }

    results.push({ reminderId: reminder.id, title: reminder.title, daysLeft, ok: sendResult.ok });
  }

  return NextResponse.json({ checked: (reminders || []).length, sent: results.length, results });
}
