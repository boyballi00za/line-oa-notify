-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).

create table if not exists delivery_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  mode text not null,
  message_type text not null,
  target text not null,
  ok boolean not null,
  status_code int,
  status_text text not null,
  latency_ms int,
  detail text,
  request_payload jsonb,
  response_body jsonb
);

create index if not exists delivery_logs_created_at_idx
  on delivery_logs (created_at desc);

-- Row Level Security stays on with no policies: the app only ever talks to this
-- table from the Next.js server (API routes) using the service_role key, which
-- bypasses RLS. The browser never receives a Supabase key, so no public policy
-- is needed or wanted here.
alter table delivery_logs enable row level security;

-- Captures incoming LINE webhook events (messages, follows, etc.) so the
-- app can surface a real userId to test with (see /app/inbox).
create table if not exists webhook_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event_type text,
  user_id text,
  message_text text
);

alter table webhook_events enable row level security;

-- Scheduled reminders: created by an external app (POST /api/reminders) that
-- has no scheduler of its own. The daily cron (/api/cron/reminders, see
-- vercel.json) checks these against today's date and sends via LINE.
create table if not exists reminders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  title text not null,
  due_date date not null,
  user_id text not null,
  remind_before_days int[] not null default '{7,3,1,0}',
  message_template text not null,
  active boolean not null default true
);

-- Tracks which (reminder, days_before) pairs have already been sent, so the
-- daily cron never double-sends the same offset for the same reminder.
create table if not exists reminder_sends (
  id bigint generated always as identity primary key,
  reminder_id bigint not null references reminders(id) on delete cascade,
  days_before int not null,
  sent_at timestamptz not null default now(),
  unique (reminder_id, days_before)
);

alter table reminders enable row level security;
alter table reminder_sends enable row level security;
