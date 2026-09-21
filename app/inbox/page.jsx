"use client";

import { useEffect, useState } from "react";

const C = {
  bg: "oklch(0.17 0.008 258)",
  text: "oklch(0.93 0.005 258)",
  border: "oklch(0.28 0.01 258)",
  panel: "oklch(0.2 0.009 258)",
  dim: "oklch(0.62 0.01 258)",
  dim2: "oklch(0.58 0.01 258)",
  divider: "oklch(0.27 0.01 258)",
  rowBorder: "oklch(0.24 0.01 258)",
  green: "oklch(0.8 0.14 160)"
};

export default function InboxPage() {
  const [events, setEvents] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  function load() {
    fetch("/api/inbox")
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  function copy(userId, rowKey) {
    navigator.clipboard.writeText(userId).then(() => {
      setCopiedId(rowKey);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'IBM Plex Sans Thai', system-ui, sans-serif", padding: "20px 22px 40px", display: "flex", flexDirection: "column", gap: "18px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", borderBottom: `1px solid ${C.border}`, paddingBottom: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>Inbox — userId ที่ทักเข้ามา</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: C.dim }}>
            ทักแชทหา OA จากมือถือ แล้วรายการจะโผล่ที่นี่ — กด &quot;คัดลอก&quot; เพื่อเอา userId ไปใช้ในหน้าส่งข้อความ
          </p>
        </div>
        <button onClick={load} style={{ border: "1px solid oklch(0.36 0.012 258)", background: "oklch(0.26 0.01 258)", color: C.text, borderRadius: "8px", padding: "8px 14px", fontSize: "12.5px", cursor: "pointer" }}>
          รีเฟรช
        </button>
      </header>

      <section style={{ border: `1px solid ${C.border}`, background: C.panel, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "84px 92px 1fr 220px 90px", gap: "0 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.06em", color: "oklch(0.56 0.01 258)", paddingBottom: "8px", borderBottom: `1px solid ${C.divider}`, minWidth: "700px" }}>
          <span>time</span>
          <span>event</span>
          <span>message</span>
          <span>userId</span>
          <span></span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", overflowX: "auto" }}>
          {events.map((row) => (
            <div key={row.id} style={{ display: "grid", gridTemplateColumns: "84px 92px 1fr 220px 90px", gap: "0 12px", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.rowBorder}`, fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", minWidth: "700px" }}>
              <span style={{ color: C.dim }}>{new Date(row.created_at).toLocaleTimeString("th-TH", { hour12: false })}</span>
              <span>{row.event_type}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.message_text || "—"}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "oklch(0.86 0.005 258)" }}>{row.user_id || "—"}</span>
              <span>
                {row.user_id && (
                  <button
                    onClick={() => copy(row.user_id, row.id)}
                    style={{ border: "1px solid oklch(0.32 0.01 258)", background: "transparent", color: copiedId === row.id ? C.green : "oklch(0.7 0.01 258)", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}
                  >
                    {copiedId === row.id ? "คัดลอกแล้ว" : "คัดลอก"}
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
        {events.length === 0 && <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: C.dim2 }}>ยังไม่มีใครทักเข้ามา — ลองแอด OA แล้วพิมพ์อะไรก็ได้จากมือถือ</p>}
      </section>
    </div>
  );
}
