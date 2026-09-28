import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Edit a queued reminder in place (e.g. reword messageTemplate) so the new
// text applies from the next send, without deleting and re-creating it.
// Only the fields present in the body are changed.
export async function PATCH(request, { params }) {
  const body = await request.json();
  const update = {};

  if ("title" in body) {
    if (!body.title) return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    update.title = body.title;
  }
  if ("messageTemplate" in body) {
    if (!body.messageTemplate) return NextResponse.json({ error: "messageTemplate cannot be empty" }, { status: 400 });
    update.message_template = body.messageTemplate;
  }
  if ("dueDate" in body) {
    if (!DATE_RE.test(body.dueDate || "")) return NextResponse.json({ error: "dueDate must be in YYYY-MM-DD format" }, { status: 400 });
    update.due_date = body.dueDate;
  }
  if ("remindBeforeDays" in body) {
    const days = body.remindBeforeDays;
    if (!Array.isArray(days) || !days.length || !days.every((n) => Number.isInteger(n) && n >= 0)) {
      return NextResponse.json({ error: "remindBeforeDays must be a non-empty array of non-negative integers" }, { status: 400 });
    }
    update.remind_before_days = days;
  }
  if ("active" in body) update.active = Boolean(body.active);

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "no editable fields provided" }, { status: 400 });
  }

  const { data, error } = await getSupabase().from("reminders").update(update).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reminder: data });
}

// Soft-cancel only — sets active=false rather than deleting the row, so the
// history (including which offsets already fired) stays intact.
export async function DELETE(request, { params }) {
  const { data, error } = await getSupabase()
    .from("reminders")
    .update({ active: false })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ reminder: data });
}
