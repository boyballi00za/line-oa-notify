import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return NextResponse.json({ events: data });
  } catch (e) {
    return NextResponse.json({ events: [], error: e instanceof Error ? e.message : String(e) });
  }
}
