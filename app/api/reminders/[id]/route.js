import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// Soft-cancel only — sets active=false rather than deleting the row, so the
// history (including which offsets already fired) stays intact.
export async function DELETE(request, { params }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
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
