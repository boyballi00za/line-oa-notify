// Creates the ThaiTax rich menu (the persistent 6-button menu under the LINE
// chat), uploads menu.png, makes it the default for every follower, and
// removes any older rich menus this script created before.
//
//   node scripts/richmenu/setup.mjs
//
// Reads LINE_CHANNEL_ACCESS_TOKEN from .env.local. Re-run after changing
// menu.html / menu.png or the button actions below.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ACTIONS, postbackData, thaitaxUrl } from "../../lib/lineMenu.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

function readToken() {
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) return process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const env = readFileSync(path.join(root, ".env.local"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("LINE_CHANNEL_ACCESS_TOKEN="));
  if (!line) throw new Error("LINE_CHANNEL_ACCESS_TOKEN not found in .env.local");
  return line.slice("LINE_CHANNEL_ACCESS_TOKEN=".length).trim();
}

const token = readToken();
const auth = { Authorization: `Bearer ${token}` };

async function line(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...auth, ...(init.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${url} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

// 3x2 grid on a 2500x1686 image; must match the tile layout in menu.html.
const COLS = [
  { x: 0, width: 833 },
  { x: 833, width: 834 },
  { x: 1667, width: 833 }
];
const ROWS = [
  { y: 0, height: 843 },
  { y: 843, height: 843 }
];
const cell = (c, r) => ({ ...COLS[c], ...ROWS[r] });

const postback = (label, action, displayText) => ({ type: "postback", label, data: postbackData(action), displayText });
const uri = (label, params) => ({ type: "uri", label, uri: thaitaxUrl(params) });

const menu = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: "ThaiTax main menu",
  chatBarText: "เมนู ThaiTax",
  areas: [
    { bounds: cell(0, 0), action: uri("เปิดแอพ ThaiTax") },
    { bounds: cell(1, 0), action: postback("บันทึกประกัน", ACTIONS.insuranceMenu, "บันทึกประกัน") },
    { bounds: cell(2, 0), action: postback("แจ้งเตือนของฉัน", ACTIONS.myReminders, "การแจ้งเตือนของฉัน") },
    { bounds: cell(0, 1), action: uri("ลดหย่อนภาษี", { tab: "deduction" }) },
    { bounds: cell(1, 1), action: uri("สวนต้นไม้ภาษี", { tab: "garden" }) },
    { bounds: cell(2, 1), action: postback("ขอ User ID", ACTIONS.getUserId, "ขอ User ID ของฉัน") }
  ]
};

await line("https://api.line.me/v2/bot/richmenu/validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(menu)
});

const { richMenuId } = await line("https://api.line.me/v2/bot/richmenu", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(menu)
});
console.log("created", richMenuId);

await line(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
  method: "POST",
  headers: { "Content-Type": "image/png" },
  body: readFileSync(path.join(here, "menu.png"))
});
console.log("uploaded image");

await line(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, { method: "POST" });
console.log("set as default for all users");

const { richmenus = [] } = await line("https://api.line.me/v2/bot/richmenu/list");
for (const old of richmenus) {
  if (old.richMenuId === richMenuId) continue;
  await line(`https://api.line.me/v2/bot/richmenu/${old.richMenuId}`, { method: "DELETE" });
  console.log("removed old menu", old.richMenuId);
}
console.log("done");
