import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("delivery_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return NextResponse.json({ logs: data });
  } catch (e) {
    // Non-fatal: an unconfigured/unreachable database shouldn't break the page,
    // it just means the delivery log starts empty.
    return NextResponse.json({ logs: [], error: e instanceof Error ? e.message : String(e) });
  }
}
