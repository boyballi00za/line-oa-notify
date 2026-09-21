# สรุปโปรเจกต์: LINE OA Notify

## จุดเริ่มต้น

โปรเจกต์เริ่มจากไฟล์ mockup `.dc.html` ที่ทำใน Claude Design (Claude Design Composer) ชื่อ **"LINE OA Notify Playground"** — เป็น UI จำลอง (sandbox) สำหรับทดสอบการส่งข้อความแจ้งเตือนผ่าน LINE Official Account โดยยังไม่ได้เชื่อมต่อ backend หรือ API จริงใดๆ เป็นแค่ตัวจำลอง latency/response ในฝั่ง browser ล้วนๆ

โจทย์คือ: **import mockup นี้มาทำให้ใช้งานได้จริง**

## สิ่งที่สร้าง

แปลง mockup เดิมให้กลายเป็นเว็บแอปที่ยิง **LINE Messaging API จริง** พร้อมระบบหลังบ้านครบวงจร

### สถาปัตยกรรม / Stack

| ส่วน | เทคโนโลยี | เหตุผลที่เลือก |
|---|---|---|
| Frontend + Backend | **Next.js** (App Router) | รวม UI และ API routes ไว้ในโปรเจกต์เดียว, deploy ง่ายกับ Vercel |
| Database | **Supabase** (Postgres) | Free tier กว้างขวาง, เขียน SQL ได้ตรงไปตรงมา, มี REST API ในตัว |
| Hosting | **Vercel** | รองรับ Next.js/serverless เต็มรูปแบบ, deploy ผ่าน CLI ได้ทันที, free tier เพียงพอ |
| Messaging | **LINE Messaging API** | ใช้ channel access token ที่เก็บเป็น secret ฝั่ง server เท่านั้น |

หลักการด้านความปลอดภัยที่ยึดตลอด: **channel access token และ Supabase service key ไม่เคยถูกส่งไปฝั่ง browser** — ทุกการเรียก LINE API และ Supabase เกิดขึ้นใน API routes ฝั่งเซิร์ฟเวอร์เท่านั้น

### ฟีเจอร์หลัก

1. **ส่งข้อความ 3 โหมด** — Push (คนเดียว), Multicast (กลุ่ม), Broadcast (ทุกคน)
2. **ข้อความ 3 ประเภท** — Text, Sticker, Image พร้อม Quick Reply buttons (สูงสุด 4 ปุ่ม)
3. **Live preview** — ดูตัวอย่างข้อความก่อนส่งจริง
4. **Request payload + response แบบ real-time** — เห็น JSON ที่จะยิงและผลลัพธ์จริงจาก LINE
5. **Code snippet generator** — คัดลอกไปใช้เป็น cURL หรือ fetch ในแอพอื่นได้ทันที
6. **Delivery log** — บันทึกประวัติการส่งทุกครั้งลง Supabase แบบถาวร (เวลา, สถานะ, ปลายทาง, latency, รายละเอียด)
7. **Webhook + Inbox** — รับ event จาก LINE (เช่นมีคนทักแชทเข้ามา) แล้วจับ `userId` มาเก็บไว้ที่หน้า `/inbox` พร้อมปุ่มคัดลอก เพื่อให้ได้ userId จริงมาทดสอบส่งโดยไม่ต้องเดา

### หน้า/Endpoint ที่ deploy จริง

- `GET /` — หน้าเว็บหลัก ใช้ส่งข้อความ
- `GET /inbox` — ดู userId ที่มีคนทักเข้ามา
- `POST /api/send` — ยิงข้อความจริงเข้า LINE + บันทึก log
- `GET /api/verify` — เช็คว่า token เชื่อมต่อ LINE ได้ไหม
- `GET /api/logs` — ดึงประวัติการส่งจาก Supabase
- `POST /api/webhook` — รับ event จาก LINE (มี signature verification ด้วย channel secret)
- `GET /api/inbox` — ดึงรายการ userId ที่จับได้จาก webhook

## ขั้นตอนการพัฒนา (ไทม์ไลน์)

1. **Import mockup** จาก Claude Design ผ่าน `claude_design` MCP — อ่านทั้ง `.dc.html` และ runtime (`support.js`) เพื่อเข้าใจโครงสร้างเดิม
2. **สร้างโปรเจกต์ Next.js ใหม่ทั้งหมด** — ติดตั้ง Node.js บนเครื่อง (ยังไม่เคยมี), เขียน API routes, แปลง UI จาก template ภาษาโบราณของ Claude Design ให้เป็น React/JSX ปกติ
3. **แก้ปัญหาความปลอดภัย** — เจอ Next.js เวอร์ชันที่มีช่องโหว่ตั้งแต่ตอน `npm install` ครั้งแรก แก้โดยอัปเกรดเป็น Next 15.5.22 + บังคับเวอร์ชัน postcss/sharp ที่แพตช์แล้วผ่าน `overrides` จนเหลือ **0 vulnerabilities**
4. **ทดสอบ end-to-end ในเครื่อง** ก่อน deploy ทุกครั้ง (`npm run build`, `npm run start`, ยิง request จริงผ่าน browser tool)
5. **เลือก stack แบบมีตัวเลือกให้ user ตัดสินใจ** — ถามและได้คำตอบ: Supabase (DB) + Vercel (hosting) + เก็บแค่ log การส่ง (ไม่เก็บ contacts/templates ในตอนแรก)
6. **เก็บ credentials จริง** — LINE channel access token, Supabase URL + service key — เข้าไปตั้งค่าให้ในทั้งสองระบบผ่าน browser automation (Supabase SQL Editor สร้างตาราง, Vercel env vars)
7. **Deploy จริงขึ้น Vercel** ผ่าน `vercel login` (device auth) → `vercel --yes` → ตั้ง env vars → `vercel --prod`
8. **แก้บั๊กหลัง deploy** — พบว่าตาราง `delivery_logs` ยังไม่ถูกสร้างจริงในโปรเจกต์ Supabase (รันผ่านแค่ในข้อความ ไม่ได้รันจริง) แก้โดยรัน SQL ตรงใน Supabase SQL Editor แล้วยืนยันว่า log บันทึกและอ่านได้จริงหลัง reload
9. **เพิ่ม Webhook + Inbox** — ตามคำขอ "อยากยิงเข้า LINE ตัวเอง" เพิ่มตาราง `webhook_events`, route `/api/webhook` (verify signature ด้วย channel secret), หน้า `/inbox` ให้คัดลอก userId ได้ง่าย

## ผลลัพธ์สุดท้าย

เว็บแอปใช้งานจริง พร้อม deploy อยู่ที่ **https://line-oa-notify.vercel.app**
เชื่อมต่อกับ LINE OA ทดสอบชื่อ "TEST TAX" (`@075jnfxt`) สำเร็จ ยืนยันด้วยการส่งข้อความจริงและตรวจสอบว่า log ถูกบันทึกถาวรใน Supabase

## แผนต่อไป (ที่ user ตั้งใจทำ)

ผู้ใช้วางแผนจะสร้าง **แอพอีกตัวแยกต่างหาก** (เช่น ระบบที่รู้ว่าใครต้องยื่นภาษีวันไหน) แล้วให้แอพนั้นเรียก `POST /api/send` ของระบบนี้เพื่อส่งการแจ้งเตือนอัตโนมัติเมื่อใกล้ถึงกำหนด — สถาปัตยกรรมปัจจุบันรองรับ use case นี้ได้ทันทีโดยไม่ต้องแก้โค้ดฝั่งนี้เพิ่ม
