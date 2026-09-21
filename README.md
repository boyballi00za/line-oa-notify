# LINE OA Notify

ส่งข้อความแจ้งเตือนจริงเข้า LINE Official Account (push / multicast / broadcast) ผ่าน backend ของแอพนี้เอง
Channel access token อยู่ฝั่ง server เท่านั้น ไม่เคยถูกส่งไปที่ browser

`LINE OA Notify Playground.html` (ไฟล์เดิม) ยังเก็บไว้เป็น static mockup/sandbox แยกต่างหาก ไม่เกี่ยวกับแอพนี้

## Stack
- Next.js (App Router) — frontend + API routes (`/api/send`, `/api/verify`, `/api/logs`)
- Supabase (Postgres) — เก็บ delivery log
- Vercel — hosting (free tier)

## 1) ตั้งค่า Supabase (ฟรี)
1. สมัคร/ล็อกอินที่ https://supabase.com แล้วสร้างโปรเจกต์ใหม่ (เลือก region ใกล้ๆ เช่น Singapore)
2. ไปที่ **SQL Editor > New query** แล้ววางเนื้อหาจากไฟล์ [`supabase/schema.sql`](supabase/schema.sql) ทั้งหมด แล้วกด Run
3. ไปที่ **Project Settings > API** แล้วคัดลอก:
   - `Project URL` → ใช้เป็น `SUPABASE_URL`
   - `service_role` key (ไม่ใช่ `anon` key) → ใช้เป็น `SUPABASE_SERVICE_ROLE_KEY`

   > `service_role` key มีสิทธิ์เต็ม ห้ามใส่ในโค้ดฝั่ง browser หรือ commit ลง git — ใช้เป็น environment variable ฝั่ง server เท่านั้น (ที่นี่คือใน API routes ของ Next.js)

## 2) หา LINE Channel access token
1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/) → เลือก Provider → เลือก Messaging API channel ของ OA ที่จะใช้ส่ง
2. แท็บ **Messaging API** → เลื่อนลงไปที่ **Channel access token** → Issue (ถ้ายังไม่มี) แล้วคัดลอกค่ามาใช้เป็น `LINE_CHANNEL_ACCESS_TOKEN`

## 3) รันในเครื่องตัวเอง (ทดสอบก่อน deploy)
```bash
npm install
copy .env.example .env.local   # แล้วกรอกค่า 3 ตัวให้ครบ
npm run dev
```
เปิด http://localhost:3000

## 4) Deploy ไป Vercel (ฟรี)
วิธีที่ง่ายที่สุด:
```bash
npx vercel login
npx vercel
```
ตอบคำถามตามค่า default ได้เลย (จะสร้างโปรเจกต์ใหม่บน Vercel จากโฟลเดอร์นี้)

จากนั้นตั้งค่า environment variables บน Vercel — ทำได้ 2 ทาง:
- ผ่านเว็บ: Vercel Dashboard → โปรเจกต์นี้ → Settings → Environment Variables → เพิ่ม `LINE_CHANNEL_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- ผ่าน CLI:
  ```bash
  npx vercel env add LINE_CHANNEL_ACCESS_TOKEN production
  npx vercel env add SUPABASE_URL production
  npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
  ```

แล้ว deploy ขึ้น production:
```bash
npx vercel --prod
```

(ถ้าอยากต่อกับ GitHub เพื่อให้ auto-deploy ทุกครั้งที่ push ก็ทำได้จากหน้า Vercel Dashboard → Import Git Repository แทนขั้นตอนข้างบน)

## หมายเหตุด้านความปลอดภัย
- `LINE_CHANNEL_ACCESS_TOKEN` และ `SUPABASE_SERVICE_ROLE_KEY` ต้องอยู่เป็น environment variable บนเซิร์ฟเวอร์/Vercel เท่านั้น ห้าม commit ลง git (มี `.gitignore` กัน `.env*` ไว้แล้ว)
- ปุ่ม "ล้างจอ" ใน Delivery log จะล้างเฉพาะรายการที่แสดงในหน้าเว็บ ไม่ได้ลบประวัติจริงใน Supabase — ถ้าต้องการลบข้อมูลจริงให้ไปลบที่ Supabase Table Editor โดยตรง
