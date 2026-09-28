// Everything the LINE chat shows beyond plain push notifications: the
// ThaiTax deep links, postback action names, quick replies, and Flex cards.
// Shared by the webhook (replies) and scripts/richmenu (the bottom menu), so
// both always point at the same places.

export const THAITAX_LIFF_ID = process.env.THAITAX_LIFF_ID || "2011692012-b6oX75kX";

// Opens ThaiTax inside LINE. `tab` / `field` are forwarded by LIFF to the app
// (as ?tab=…&field=… or inside liff.state) so it can jump straight to a page.
export function thaitaxUrl(params) {
  const base = `https://liff.line.me/${THAITAX_LIFF_ID}`;
  const qs = params ? new URLSearchParams(params).toString() : "";
  return qs ? `${base}?${qs}` : base;
}

export const ACTIONS = {
  getUserId: "get_user_id",
  insuranceMenu: "insurance_menu",
  myReminders: "my_reminders"
};

export function postbackData(action) {
  return `action=${action}`;
}

export function parsePostbackAction(data) {
  return new URLSearchParams(data || "").get("action");
}

const BRAND = "#0B6394";

// Field keys and caps mirror ThaiTax's js/data.js RELIEFS, so a tap lands on
// the page that actually holds that input.
export const INSURANCE_OPTIONS = [
  { icon: "🛡️", label: "ประกันชีวิต", cap: "ลดหย่อนได้สูงสุด 100,000 บาท", tab: "ded-insurance", field: "lifeInsurance" },
  { icon: "🩺", label: "ประกันสุขภาพตนเอง", cap: "สูงสุด 25,000 บาท (นับรวมเพดาน 100,000)", tab: "ded-insurance", field: "healthInsuranceSelf" },
  { icon: "👨‍👩‍👦", label: "ประกันสุขภาพพ่อแม่", cap: "สูงสุด 15,000 บาท", tab: "ded-family", field: "parentHealthInsurance" },
  { icon: "📈", label: "ประกันชีวิตแบบบำนาญ", cap: "15% ของเงินได้ ไม่เกิน 200,000 บาท", tab: "ded-funds", field: "pensionInsurance" },
  { icon: "🏥", label: "ประกันสังคม", cap: "ตามจ่ายจริง สูงสุด 9,000 บาท", tab: "ded-insurance", field: "socialSecurity" }
];

export function quickReplyItems() {
  return [
    { type: "action", action: { type: "postback", label: "🛡️ บันทึกประกัน", data: postbackData(ACTIONS.insuranceMenu), displayText: "บันทึกประกัน" } },
    { type: "action", action: { type: "postback", label: "🔔 แจ้งเตือนของฉัน", data: postbackData(ACTIONS.myReminders), displayText: "การแจ้งเตือนของฉัน" } },
    { type: "action", action: { type: "uri", label: "📱 เปิดแอพ ThaiTax", uri: thaitaxUrl() } },
    { type: "action", action: { type: "postback", label: "🆔 ขอ User ID", data: postbackData(ACTIONS.getUserId), displayText: "ขอ User ID ของฉัน" } }
  ];
}

export function textMessage(text, withQuickReply = true) {
  const m = { type: "text", text };
  if (withQuickReply) m.quickReply = { items: quickReplyItems() };
  return m;
}

export function insurancePickerMessage() {
  return {
    type: "flex",
    altText: "บันทึกประกัน — เลือกประเภทประกันที่ต้องการกรอก",
    quickReply: { items: quickReplyItems() },
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "18px",
        contents: [
          { type: "text", text: "🛡️ บันทึกประกัน", color: "#FFFFFF", weight: "bold", size: "lg" },
          { type: "text", text: "เลือกประเภทที่อยากกรอก แล้วหนูจะพาไปหน้ากรอกในแอพ ThaiTax ให้เลยค่ะ", color: "#DCEEFA", size: "xs", wrap: true, margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        contents: INSURANCE_OPTIONS.map((o) => ({
          type: "box",
          layout: "horizontal",
          paddingAll: "10px",
          cornerRadius: "10px",
          backgroundColor: "#F2F7FB",
          action: { type: "uri", uri: thaitaxUrl({ tab: o.tab, field: o.field }) },
          contents: [
            { type: "text", text: o.icon, flex: 0, size: "xl", gravity: "center" },
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              margin: "md",
              contents: [
                { type: "text", text: o.label, weight: "bold", size: "sm", color: "#1A1A2E" },
                { type: "text", text: o.cap, size: "xxs", color: "#6B7280", wrap: true }
              ]
            },
            { type: "text", text: "›", flex: 0, size: "xxl", color: BRAND, gravity: "center" }
          ]
        }))
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "14px",
        contents: [
          { type: "button", style: "primary", color: BRAND, height: "sm", action: { type: "uri", label: "ดูบันทึกทั้งหมดในแอพ", uri: thaitaxUrl({ tab: "vault" }) } },
          { type: "text", text: "* เบี้ยประกันชีวิต + สุขภาพตนเอง รวมกันไม่เกิน 100,000 บาท", size: "xxs", color: "#9CA3AF", wrap: true, margin: "md" }
        ]
      }
    }
  };
}

function thaiDate(isoDate) {
  return new Date(`${isoDate}T00:00:00+07:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok"
  });
}

function whenLabel(daysLeft) {
  if (daysLeft <= 0) return "วันนี้";
  if (daysLeft === 1) return "พรุ่งนี้";
  return `อีก ${daysLeft} วัน`;
}

// rows: [{ title, due_date, daysLeft }], already sorted soonest first.
export function remindersListMessage(rows, totalUpcoming) {
  const more = totalUpcoming - rows.length;
  return {
    type: "flex",
    altText: `การแจ้งเตือนที่กำลังจะมาถึง ${totalUpcoming} รายการ`,
    quickReply: { items: quickReplyItems() },
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "18px",
        contents: [
          { type: "text", text: "🔔 การแจ้งเตือนของฉัน", color: "#FFFFFF", weight: "bold", size: "lg" },
          { type: "text", text: `มีทั้งหมด ${totalUpcoming} รายการที่กำลังจะมาถึงค่ะ`, color: "#DCEEFA", size: "xs", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "14px",
        contents: [
          ...rows.map((r) => ({
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: r.title, size: "sm", color: "#1A1A2E", wrap: true, maxLines: 2, flex: 5 },
              {
                type: "box",
                layout: "vertical",
                flex: 3,
                contents: [
                  { type: "text", text: whenLabel(r.daysLeft), size: "xs", weight: "bold", color: r.daysLeft <= 1 ? "#D97706" : BRAND, align: "end" },
                  { type: "text", text: thaiDate(r.due_date), size: "xxs", color: "#9CA3AF", align: "end" }
                ]
              }
            ]
          })),
          ...(more > 0 ? [{ type: "text", text: `และอีก ${more} รายการ`, size: "xxs", color: "#9CA3AF", margin: "md" }] : [])
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "14px",
        contents: [
          { type: "button", style: "primary", color: BRAND, height: "sm", action: { type: "uri", label: "จัดการในแอพ ThaiTax", uri: thaitaxUrl({ tab: "reminders" }) } }
        ]
      }
    }
  };
}
