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
  green: "oklch(0.8 0.14 160)",
  red: "oklch(0.7 0.16 25)"
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState([]);

  function load() {
    fetch("/api/reminders")
      .then((r) => r.json())
      .then((data) => setReminders(data.reminders || []))
      .catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id) {
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'IBM Plex Sans Thai', system-ui, sans-serif", padding: "20px 22px 40px", display: "flex", flexDirection: "column", gap: "18px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", borderBottom: `1px solid ${C.border}`, paddingBottom: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>Reminders — แจ้งเตือนตามกำหนดเวลา</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: C.dim }}>
            รายการนี้ถูกสร้างโดยแอพภายนอกผ่าน <code>POST /api/reminders</code> — ตัว cron จะเช็คทุกวัน 09:00 น. แล้วส่งให้อัตโนมัติตามวันที่ตั้งไว้
          </p>
        </div>
        <button onClick={load} style={{ border: "1px solid oklch(0.36 0.012 258)", background: "oklch(0.26 0.01 258)", color: C.text, borderRadius: "8px", padding: "8px 14px", fontSize: "12.5px", cursor: "pointer" }}>
          รีเฟรช
        </button>
      </header>

      <section style={{ border: `1px solid ${C.border}`, background: C.panel, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 160px 140px 80px 80px", gap: "0 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.06em", color: "oklch(0.56 0.01 258)", paddingBottom: "8px", borderBottom: `1px solid ${C.divider}`, minWidth: "760px" }}>
          <span>title</span>
          <span>due date</span>
          <span>userId</span>
          <span>remind before (days)</span>
          <span>active</span>
          <span></span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", overflowX: "auto" }}>
          {reminders.map((r) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 160px 140px 80px 80px", gap: "0 12px", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.rowBorder}`, fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", minWidth: "760px" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
              <span>{r.due_date}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "oklch(0.86 0.005 258)" }}>{r.user_id}</span>
              <span>{Array.isArray(r.remind_before_days) ? r.remind_before_days.join(", ") : "—"}</span>
              <span style={{ color: r.active ? C.green : C.red }}>{r.active ? "active" : "cancelled"}</span>
              <span>
                {r.active && (
                  <button onClick={() => cancel(r.id)} style={{ border: "1px solid oklch(0.32 0.01 258)", background: "transparent", color: "oklch(0.68 0.1 25)", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}>
                    ยกเลิก
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
        {reminders.length === 0 && <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: C.dim2 }}>ยังไม่มี reminder — สร้างผ่าน POST /api/reminders จากแอพภายนอก</p>}
      </section>
    </div>
  );
}
