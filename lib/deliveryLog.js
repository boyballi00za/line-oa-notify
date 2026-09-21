import { getSupabase } from "@/lib/supabase";

// Shared by /api/send and the reminders cron so both write to the same
// delivery_logs table with the same shape.
export async function logDelivery(entry) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("delivery_logs")
      .insert({
        mode: entry.mode,
        message_type: entry.messageType,
        target: entry.target,
        ok: entry.ok,
        status_code: entry.statusCode,
        status_text: entry.statusText,
        latency_ms: entry.latencyMs,
        detail: entry.detail,
        request_payload: entry.payload,
        response_body: entry.response
      })
      .select()
      .single();
    if (error) {
      console.error("[supabase] insert delivery_logs failed:", error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error("[supabase] logDelivery error:", e instanceof Error ? e.message : e);
    return null;
  }
}
