// Pure helpers shared by the client (for preview/snippet display) and the
// server (for the actual LINE API call). No secrets live here.

export function buildTargets(mode, singleId, multiIds) {
  if (mode === "single") return [String(singleId || "").trim()].filter(Boolean);
  if (mode === "multi") {
    return String(multiIds || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function buildMessage({ type, text, packageId, stickerId, imageUrl, useQuick, quick }) {
  let m;
  if (type === "text") {
    m = { type: "text", text: text || "" };
  } else if (type === "sticker") {
    m = { type: "sticker", packageId, stickerId };
  } else {
    m = {
      type: "image",
      originalContentUrl: imageUrl || "https://cdn.example.com/notify.png",
      previewImageUrl: imageUrl || "https://cdn.example.com/notify-preview.png"
    };
  }
  if (useQuick && Array.isArray(quick) && quick.length) {
    const items = quick
      .filter((q) => q.label && q.label.trim())
      .map((q) => ({ type: "action", action: { type: "message", label: q.label, text: q.label } }));
    if (items.length) m.quickReply = { items };
  }
  return m;
}

export function buildEndpoint(mode) {
  if (mode === "single") return "/v2/bot/message/push";
  if (mode === "multi") return "/v2/bot/message/multicast";
  return "/v2/bot/message/broadcast";
}

export function buildPayload(fields) {
  const { mode, singleId, multiIds } = fields;
  const targets = buildTargets(mode, singleId, multiIds);
  const body = { messages: [buildMessage(fields)] };
  if (mode === "single") return Object.assign({ to: targets[0] || "" }, body);
  if (mode === "multi") return Object.assign({ to: targets }, body);
  return body;
}
