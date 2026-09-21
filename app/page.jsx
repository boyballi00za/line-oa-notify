"use client";

import { useEffect, useState } from "react";
import { buildTargets, buildEndpoint, buildPayload } from "@/lib/linePayload";

const C = {
  bg: "oklch(0.17 0.008 258)",
  text: "oklch(0.93 0.005 258)",
  border: "oklch(0.28 0.01 258)",
  panel: "oklch(0.2 0.009 258)",
  panel2: "oklch(0.21 0.009 258)",
  inputBg: "oklch(0.15 0.008 258)",
  inputBorder: "oklch(0.31 0.01 258)",
  dim: "oklch(0.62 0.01 258)",
  dim2: "oklch(0.58 0.01 258)",
  dim3: "oklch(0.66 0.01 258)",
  dim4: "oklch(0.6 0.01 258)",
  divider: "oklch(0.27 0.01 258)",
  rowBorder: "oklch(0.24 0.01 258)",
  green: "oklch(0.8 0.14 160)",
  greenBright: "oklch(0.82 0.15 158)",
  greenSlow: "oklch(0.62 0.07 160)",
  greenDark: "oklch(0.18 0.02 160)",
  red: "oklch(0.72 0.16 25)",
  redBright: "oklch(0.7 0.16 25)",
  orange: "oklch(0.78 0.13 75)",
  warnBorder: "oklch(0.42 0.09 75)",
  warnBg: "oklch(0.26 0.04 75)",
  warnText: "oklch(0.86 0.08 80)"
};

function chip(active) {
  return active
    ? { b: "oklch(0.62 0.12 160)", g: "oklch(0.3 0.06 160)", f: "oklch(0.9 0.1 160)" }
    : { b: "oklch(0.32 0.01 258)", g: "oklch(0.24 0.01 258)", f: "oklch(0.78 0.008 258)" };
}

function chipButtonStyle(c, extra) {
  return { border: `1px solid ${c.b}`, background: c.g, color: c.f, borderRadius: "8px", padding: "8px 13px", fontSize: "12.5px", cursor: "pointer", ...extra };
}

const labelStyle = { fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim4 };
const smallLabelStyle = { fontSize: "11px", color: C.dim4 };

const inputStyle = {
  background: C.inputBg,
  border: `1px solid ${C.inputBorder}`,
  borderRadius: "8px",
  padding: "10px 12px",
  color: C.text,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "13px",
  width: "100%"
};

const panelStyle = { border: `1px solid ${C.border}`, background: C.panel, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" };

const sectionTitleStyle = { margin: 0, fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim3 };

const preStyle = { margin: 0, background: "oklch(0.14 0.008 258)", border: `1px solid ${C.divider}`, borderRadius: "8px", padding: "12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "11.5px", lineHeight: "1.6", overflow: "auto" };

const STICKER_PRESETS = [
  { label: "446/1988", p: "446", i: "1988" },
  { label: "446/1989", p: "446", i: "1989" },
  { label: "789/10855", p: "789", i: "10855" },
  { label: "11537/52002734", p: "11537", i: "52002734" }
];

function StatCard({ label, value, color }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, background: C.panel2, borderRadius: "10px", padding: "8px 14px", minWidth: "96px" }}>
      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.dim2 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "19px", fontWeight: 500, ...(color ? { color } : null) }}>{value}</div>
    </div>
  );
}

function statusColor(ok, code) {
  if (ok) return C.green;
  if (code === 400) return C.orange;
  return C.redBright;
}

function toLogRow(row) {
  return {
    id: row.id,
    time: new Date(row.created_at).toLocaleTimeString("th-TH", { hour12: false }),
    status: String(row.status_code ?? "—"),
    color: statusColor(row.ok, row.status_code),
    target: row.target,
    latency: row.latency_ms != null ? row.latency_ms + "ms" : "—",
    detail: row.detail || ""
  };
}

export default function Page() {
  const [state, setStateRaw] = useState({
    mode: "single",
    singleId: "U4af4980629abcdef1234567890abcdef",
    multiIds: "U4af4980629abcdef1234567890abcdef\nUb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6\nUcc11dd22ee33ff44aa55bb66cc77dd88",
    type: "text",
    text: "แจ้งเตือน: มีคำสั่งซื้อใหม่ #10428\nยอดรวม 1,290 บาท · ชำระแล้ว",
    useQuick: true,
    quick: [{ id: 1, label: "ดูคำสั่งซื้อ" }, { id: 2, label: "ปิดแจ้งเตือน" }],
    packageId: "446",
    stickerId: "1988",
    imageUrl: "",
    snippetTab: "curl",
    sending: false,
    last: null,
    logs: [],
    conn: { checked: false, ok: false, displayName: "", error: "" }
  });

  function setState(patch) {
    setStateRaw((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }

  async function checkConnection() {
    setState({ conn: { checked: false, ok: false, displayName: "", error: "" } });
    try {
      const res = await fetch("/api/verify");
      const data = await res.json();
      setState({ conn: { checked: true, ok: data.ok, displayName: data.displayName || data.basicId || "", error: data.error || "" } });
    } catch (e) {
      setState({ conn: { checked: true, ok: false, displayName: "", error: String(e) } });
    }
  }

  useEffect(() => {
    checkConnection();
    fetch("/api/logs")
      .then((r) => r.json())
      .then((data) => setState({ logs: (data.logs || []).map(toLogRow) }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function targets() {
    return buildTargets(state.mode, state.singleId, state.multiIds);
  }

  async function send() {
    if (state.sending) return;
    setState({ sending: true });
    const targetLabel =
      state.mode === "broadcast"
        ? "all friends"
        : state.mode === "multi"
          ? `${targets().length} userIds`
          : `${(targets()[0] || "—").slice(0, 18)}…`;
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: state.mode,
          singleId: state.singleId,
          multiIds: state.multiIds,
          type: state.type,
          text: state.text,
          packageId: state.packageId,
          stickerId: state.stickerId,
          imageUrl: state.imageUrl,
          useQuick: state.useQuick,
          quick: state.quick
        })
      });
      const data = await res.json();
      setState({ sending: false, last: { ok: data.ok, status: data.status, ms: data.ms, body: data.body } });
      if (data.log) {
        setState((s) => ({ logs: [toLogRow(data.log)].concat(s.logs).slice(0, 40) }));
      } else {
        setState((s) => ({
          logs: [
            {
              id: Date.now(),
              time: new Date().toLocaleTimeString("th-TH", { hour12: false }),
              status: data.status ? data.status.split(" ")[0] : "ERR",
              color: data.ok ? C.green : C.redBright,
              target: targetLabel,
              latency: data.ms ? data.ms + "ms" : "—",
              detail: data.ok ? "" : data.body?.message || "request failed"
            }
          ].concat(s.logs).slice(0, 40)
        }));
      }
    } catch (e) {
      setState({ sending: false, last: { ok: false, status: "Network Error", ms: 0, body: { message: String(e) } } });
    }
  }

  function snippet() {
    const ep = "https://api.line.me" + buildEndpoint(state.mode);
    const body = JSON.stringify(buildPayload(state), null, 2);
    if (state.snippetTab === "curl") {
      return `curl -X POST ${ep} \\\n  -H 'Authorization: Bearer $LINE_CHANNEL_TOKEN' \\\n  -H 'Content-Type: application/json' \\\n  -d '${body.replace(/\n/g, "\n  ")}'`;
    }
    return `// server-side only\nawait fetch("${ep}", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.LINE_CHANNEL_TOKEN}\`,\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify(${body.replace(/\n/g, "\n  ")})\n});`;
  }

  const isSingle = state.mode === "single", isMulti = state.mode === "multi", isBroadcast = state.mode === "broadcast";
  const isText = state.type === "text", isSticker = state.type === "sticker", isImage = state.type === "image";
  const done = state.logs.filter((l) => l.latency !== "—");
  const avg = done.length ? Math.round(done.reduce((a, l) => a + parseInt(l.latency, 10), 0) / done.length) : 0;

  const modeSingle = chip(isSingle), modeMulti = chip(isMulti), modeBroad = chip(isBroadcast);
  const tText = chip(isText), tSticker = chip(isSticker), tImage = chip(isImage);
  const quickToggle = { label: state.useQuick ? "on" : "off", ...chip(state.useQuick) };
  const cCurl = chip(state.snippetTab === "curl"), cJs = chip(state.snippetTab === "js");
  const hasResponse = !!state.last;
  const sendBg = state.sending ? C.greenSlow : C.greenBright;
  const sendLabel = state.sending ? "กำลังส่ง…" : isBroadcast ? "ส่ง broadcast" : "ส่งข้อความ";

  const connDot = !state.conn.checked ? C.dim2 : state.conn.ok ? C.green : C.redBright;
  const connLabel = !state.conn.checked
    ? "กำลังตรวจสอบการเชื่อมต่อ…"
    : state.conn.ok
      ? `เชื่อมต่อแล้ว · ${state.conn.displayName}`
      : `เชื่อมต่อไม่สำเร็จ: ${state.conn.error}`;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'IBM Plex Sans Thai', system-ui, sans-serif", padding: "20px 22px 40px", display: "flex", flexDirection: "column", gap: "18px" }}>
      <header style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, paddingBottom: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "oklch(0.75 0.15 160)", display: "grid", placeItems: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "14px", color: C.greenDark }}>L</div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 600, letterSpacing: "-0.01em" }}>LINE OA Notify</h1>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: C.dim2, border: "1px solid oklch(0.3 0.01 258)", borderRadius: "999px", padding: "2px 8px" }}>v1.0 · live</span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: C.dim3, maxWidth: "62ch" }}>ส่งข้อความแจ้งเตือนจริงเข้า LINE Official Account ผ่าน backend ของแอพนี้ — token ไม่เคยถูกส่งไปฝั่ง browser</p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <StatCard label="Requests" value={state.logs.length} />
          <StatCard label="Success" value={state.logs.filter((l) => l.status === "200").length} color={C.green} />
          <StatCard label="Avg latency" value={avg ? avg + "ms" : "—"} />
        </div>
      </header>

      <section style={{ ...panelStyle, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "'JetBrains Mono', monospace", fontSize: "12.5px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: connDot }} />
          <span style={{ color: connDot }}>{connLabel}</span>
        </div>
        <button onClick={checkConnection} style={{ border: "1px solid oklch(0.36 0.012 258)", background: "oklch(0.26 0.01 258)", color: C.text, borderRadius: "8px", padding: "8px 14px", fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>
          ตรวจสอบการเชื่อมต่อใหม่
        </button>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "18px", alignItems: "start" }}>
        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}>1 · ผู้รับ (Recipients)</h2>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => setState({ mode: "single" })} style={chipButtonStyle(modeSingle)}>Push · 1 คน</button>
            <button onClick={() => setState({ mode: "multi" })} style={chipButtonStyle(modeMulti)}>Multicast · กลุ่มทดสอบ</button>
            <button onClick={() => setState({ mode: "broadcast" })} style={chipButtonStyle(modeBroad)}>Broadcast · ทุกคน</button>
          </div>

          {isSingle && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={smallLabelStyle}>userId ปลายทาง</label>
              <input value={state.singleId} onChange={(e) => setState({ singleId: e.target.value })} placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" style={{ ...inputStyle, fontSize: "12.5px" }} />
            </div>
          )}

          {isMulti && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={smallLabelStyle}>userId ทีละบรรทัด (สูงสุด 500 ต่อ request)</label>
              <textarea value={state.multiIds} onChange={(e) => setState({ multiIds: e.target.value })} rows={4} style={{ ...inputStyle, fontSize: "12.5px", resize: "vertical" }} />
              <span style={{ fontSize: "11.5px", color: C.dim4, fontFamily: "'JetBrains Mono', monospace" }}>{targets().length} recipients</span>
            </div>
          )}

          {isBroadcast && (
            <div style={{ border: `1px solid ${C.warnBorder}`, background: C.warnBg, borderRadius: "8px", padding: "10px 12px", fontSize: "12.5px", color: C.warnText }}>
              โหมด broadcast ส่งถึงเพื่อนทุกคนของ OA จริง และนับโควตาข้อความจริง — ใช้ด้วยความระมัดระวัง
            </div>
          )}

          <div style={{ height: "1px", background: C.divider }} />
          <h2 style={sectionTitleStyle}>2 · ข้อความ (Message)</h2>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => setState({ type: "text" })} style={chipButtonStyle(tText, { padding: "7px 12px", fontFamily: "'JetBrains Mono', monospace" })}>text</button>
            <button onClick={() => setState({ type: "sticker" })} style={chipButtonStyle(tSticker, { padding: "7px 12px", fontFamily: "'JetBrains Mono', monospace" })}>sticker</button>
            <button onClick={() => setState({ type: "image" })} style={chipButtonStyle(tImage, { padding: "7px 12px", fontFamily: "'JetBrains Mono', monospace" })}>image</button>
          </div>

          {isText && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <textarea
                value={state.text}
                onChange={(e) => setState({ text: e.target.value })}
                rows={5}
                placeholder="ข้อความแจ้งเตือน"
                style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: "8px", padding: "11px 12px", color: C.text, fontSize: "13.5px", lineHeight: "1.55", resize: "vertical", width: "100%" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: C.dim4, fontFamily: "'JetBrains Mono', monospace" }}>
                <span>{state.text.length} / 5000</span>
                <span>รองรับตัวแปร {"{{name}}"} จากฝั่งเรียกใช้</span>
              </div>
            </div>
          )}

          {isSticker && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                  <label style={smallLabelStyle}>packageId</label>
                  <input value={state.packageId} onChange={(e) => setState({ packageId: e.target.value })} style={{ ...inputStyle, padding: "9px 12px", fontSize: "12.5px" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                  <label style={smallLabelStyle}>stickerId</label>
                  <input value={state.stickerId} onChange={(e) => setState({ stickerId: e.target.value })} style={{ ...inputStyle, padding: "9px 12px", fontSize: "12.5px" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {STICKER_PRESETS.map((p) => (
                  <button key={p.label} onClick={() => setState({ packageId: p.p, stickerId: p.i })} style={{ border: "1px solid oklch(0.33 0.01 258)", background: "oklch(0.24 0.01 258)", color: "oklch(0.82 0.008 258)", borderRadius: "8px", padding: "6px 10px", fontSize: "11.5px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isImage && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input value={state.imageUrl} onChange={(e) => setState({ imageUrl: e.target.value })} placeholder="https://cdn.example.com/notify.png (ต้องเป็น HTTPS)" style={{ ...inputStyle, fontSize: "12.5px" }} />
              <div style={{ height: "120px", borderRadius: "8px", border: "1px dashed oklch(0.36 0.012 258)", backgroundImage: "repeating-linear-gradient(135deg, oklch(0.23 0.01 258) 0 8px, oklch(0.2 0.009 258) 8px 16px)", display: "grid", placeItems: "center" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11.5px", color: C.dim2 }}>image preview · 1024×1024 max</span>
              </div>
            </div>
          )}

          <div style={{ height: "1px", background: C.divider }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <h2 style={sectionTitleStyle}>3 · Quick reply</h2>
            <button onClick={() => setState({ useQuick: !state.useQuick })} style={chipButtonStyle(quickToggle, { borderRadius: "999px", padding: "5px 12px", fontSize: "11.5px", fontFamily: "'JetBrains Mono', monospace" })}>
              {quickToggle.label}
            </button>
          </div>

          {state.useQuick && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {state.quick.map((q, i) => (
                <div key={q.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "oklch(0.55 0.01 258)", width: "16px" }}>{i + 1}</span>
                  <input
                    value={q.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setState((st) => ({ quick: st.quick.map((x) => (x.id === q.id ? { id: x.id, label: v } : x)) }));
                    }}
                    placeholder="ข้อความบนปุ่ม"
                    style={{ flex: 1, background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: "8px", padding: "8px 11px", color: C.text, fontSize: "13px" }}
                  />
                  <button onClick={() => setState((st) => ({ quick: st.quick.filter((x) => x.id !== q.id) }))} style={{ border: "1px solid oklch(0.32 0.01 258)", background: "transparent", color: "oklch(0.68 0.1 25)", borderRadius: "8px", padding: "7px 10px", fontSize: "12px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => setState((st) => (st.quick.length >= 4 ? {} : { quick: st.quick.concat({ id: Date.now(), label: "ปุ่มใหม่" }) }))}
                style={{ alignSelf: "flex-start", border: "1px dashed oklch(0.36 0.012 258)", background: "transparent", color: "oklch(0.72 0.01 258)", borderRadius: "8px", padding: "7px 12px", fontSize: "12px", cursor: "pointer" }}
              >
                + เพิ่มปุ่ม (สูงสุด 4)
              </button>
            </div>
          )}

          <button
            onClick={send}
            disabled={state.sending}
            style={{ marginTop: "4px", border: "none", background: sendBg, color: C.greenDark, borderRadius: "10px", padding: "14px 18px", fontSize: "14.5px", fontWeight: 600, cursor: "pointer", letterSpacing: "0.01em" }}
          >
            {sendLabel}
          </button>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <section style={panelStyle}>
            <h2 style={sectionTitleStyle}>Preview</h2>
            <div style={{ background: "oklch(0.31 0.018 250)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px", minHeight: "180px" }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {isText && <div style={{ maxWidth: "78%", background: "oklch(0.86 0.15 150)", color: "oklch(0.24 0.03 150)", borderRadius: "14px 14px 4px 14px", padding: "10px 13px", fontSize: "13.5px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>{state.text}</div>}
                {isSticker && (
                  <div style={{ width: "96px", height: "96px", borderRadius: "12px", background: "oklch(0.94 0.01 258)", display: "grid", placeItems: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "10.5px", color: "oklch(0.45 0.01 258)", textAlign: "center", padding: "6px" }}>
                    sticker
                    <br />
                    {state.packageId}/{state.stickerId}
                  </div>
                )}
                {isImage && <div style={{ width: "150px", height: "110px", borderRadius: "12px", backgroundImage: "repeating-linear-gradient(135deg, oklch(0.9 0.01 258) 0 8px, oklch(0.84 0.01 258) 8px 16px)", display: "grid", placeItems: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "10.5px", color: "oklch(0.42 0.01 258)" }}>image</div>}
              </div>
              {state.useQuick && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "4px" }}>
                  {state.quick.map((q) => (
                    <span key={q.id} style={{ background: "oklch(0.96 0.005 258)", color: "oklch(0.4 0.05 160)", borderRadius: "999px", padding: "7px 14px", fontSize: "12.5px", minHeight: "34px", display: "inline-flex", alignItems: "center" }}>
                      {q.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <h2 style={sectionTitleStyle}>Request payload</h2>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: C.dim2 }}>POST {buildEndpoint(state.mode)}</span>
            </div>
            <pre style={{ ...preStyle, color: "oklch(0.84 0.02 160)", maxHeight: "240px" }}>{JSON.stringify(buildPayload(state), null, 2)}</pre>
            {hasResponse && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "'JetBrains Mono', monospace", fontSize: "11.5px" }}>
                  <span style={{ color: state.last.ok ? C.green : C.red }}>{state.last.status}</span>
                  <span style={{ color: C.dim2 }}>{state.last.ms ? state.last.ms + "ms · " + buildEndpoint(state.mode) : buildEndpoint(state.mode)}</span>
                </div>
                <pre style={{ ...preStyle, color: "oklch(0.8 0.01 258)", maxHeight: "160px" }}>{JSON.stringify(state.last.body, null, 2)}</pre>
              </div>
            )}
          </section>

          <section style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={sectionTitleStyle}>นำไปใช้ในเว็บแอพอื่น</h2>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setState({ snippetTab: "curl" })} style={chipButtonStyle(cCurl, { borderRadius: "7px", padding: "5px 11px", fontSize: "11.5px", fontFamily: "'JetBrains Mono', monospace" })}>cURL</button>
                <button onClick={() => setState({ snippetTab: "js" })} style={chipButtonStyle(cJs, { borderRadius: "7px", padding: "5px 11px", fontSize: "11.5px", fontFamily: "'JetBrains Mono', monospace" })}>fetch</button>
              </div>
            </div>
            <pre style={{ ...preStyle, color: "oklch(0.86 0.008 258)", maxHeight: "260px", whiteSpace: "pre" }}>{snippet()}</pre>
            <p style={{ margin: 0, fontSize: "12px", color: C.dim2 }}>เรียกจาก backend เท่านั้น — อย่าให้ channel token หลุดไปอยู่ในโค้ดฝั่ง browser</p>
          </section>
        </div>
      </div>

      <section style={panelStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <h2 style={sectionTitleStyle}>Delivery log</h2>
          <button onClick={() => setState({ logs: [] })} style={{ border: "1px solid oklch(0.32 0.01 258)", background: "transparent", color: "oklch(0.7 0.01 258)", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", cursor: "pointer" }}>
            ล้างจอ (ประวัติจริงยังอยู่ใน Supabase)
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "84px 92px 1fr 92px 1fr", gap: "0 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.06em", color: "oklch(0.56 0.01 258)", paddingBottom: "8px", borderBottom: `1px solid ${C.divider}`, minWidth: "640px" }}>
          <span>time</span><span>status</span><span>target</span><span>latency</span><span>detail</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", overflowX: "auto" }}>
          {state.logs.map((row) => (
            <div key={row.id} style={{ display: "grid", gridTemplateColumns: "84px 92px 1fr 92px 1fr", gap: "0 12px", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.rowBorder}`, fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", minWidth: "640px" }}>
              <span style={{ color: C.dim }}>{row.time}</span>
              <span style={{ color: row.color }}>{row.status}</span>
              <span style={{ color: "oklch(0.86 0.005 258)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.target}</span>
              <span style={{ color: "oklch(0.7 0.01 258)" }}>{row.latency}</span>
              <span style={{ color: C.dim3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.detail}</span>
            </div>
          ))}
        </div>
        {state.logs.length === 0 && <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: C.dim2 }}>ยังไม่มี request — กดปุ่มส่งเพื่อเริ่มทดสอบ</p>}
      </section>
    </div>
  );
}
