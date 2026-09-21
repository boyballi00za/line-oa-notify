import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Called by an external app that has no scheduler of its own: it registers
// "notify this userId about this deadline" once, and our daily cron
// (see /api/cron/reminders) takes care of actually sending on the right days.
export async function POST(request) {
  const body = await request.json();
  const { title, dueDate, userId, messageTemplate } = body;
  const remindBeforeDays = Array.isArray(body.remindBeforeDays) && body.remindBeforeDays.length ? body.remindBeforeDays : [7, 3, 1, 0];

  if (!title || !dueDate || !userId || !messageTemplate) {
    return NextResponse.json({ error: "title, dueDate, userId, and messageTemplate are required" }, { status: 400 });
  }
  if (!DATE_RE.test(dueDate)) {
    return NextResponse.json({ error: "dueDate must be in YYYY-MM-DD format" }, { status: 400 });
  }
  if (!remindBeforeDays.every((n) => Number.isInteger(n) && n >= 0)) {
    return NextResponse.json({ error: "remindBeforeDays must be an array of non-negative integers" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reminders")
    .insert({
      title,
      due_date: dueDate,
      user_id: userId,
      remind_before_days: remindBeforeDays,
      message_template: messageTemplate,
      active: true
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ reminder: data }, { status: 201 });
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .order("due_date", { ascending: true })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ reminders: data });
  } catch (e) {
    return NextResponse.json({ reminders: [], error: e instanceof Error ? e.message : String(e) });
  }
}
