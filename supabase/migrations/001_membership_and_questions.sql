-- Supabase RLS for the gwiwha membership-protected question bank.
-- Run this in Supabase Dashboard -> SQL Editor after public.members exists.
--
-- Expected existing public.members columns:
--   id int8 primary key
--   created_at timestamptz default now()
--   note text
--   email text
--   active bool default true
--
-- This migration intentionally does not create, drop, or replace public.members.

create index if not exists members_email_normalized_idx
on public.members (lower(btrim(email)));

create table if not exists public.questions (
  id text primary key,
  category text not null,
  type text not null,
  exam text not null default 'nat',
  question_number integer not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists questions_exam_idx on public.questions (exam);
create index if not exists questions_type_idx on public.questions (type);
create index if not exists questions_category_idx on public.questions (category);
create index if not exists questions_exam_type_category_idx on public.questions (exam, type, category);
create index if not exists questions_question_number_idx on public.questions (question_number);

alter table public.members enable row level security;
alter table public.questions enable row level security;

grant select on public.members to authenticated;
revoke insert, update, delete on public.members from anon, authenticated;

grant select on public.questions to authenticated;
revoke insert, update, delete on public.questions from anon, authenticated;

drop policy if exists "members can read own row" on public.members;
create policy "members can read own row"
on public.members
for select
to authenticated
using (
  lower(btrim(coalesce(email, ''))) =
  lower(btrim(coalesce(((select auth.jwt()) ->> 'email'), '')))
);

drop policy if exists "active members can read questions" on public.questions;
create policy "active members can read questions"
on public.questions
for select
to authenticated
using (
  exists (
    select 1
    from public.members m
    where lower(btrim(coalesce(m.email, ''))) =
          lower(btrim(coalesce(((select auth.jwt()) ->> 'email'), '')))
      and m.active is true
  )
);

-- No insert/update/delete policies are created for browser users.
-- Manage members in Supabase Dashboard. Import questions with a service-role key
-- or from the Dashboard SQL tools, never from browser JavaScript.
