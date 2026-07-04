-- ===== 0006: الرسائل المباشرة — تسليم حقيقي بين المستخدمين =====
-- بخلاف account_states (مستند خاص لكل مستخدم)، هذا جدول علائقي: المرسِل يكتب
-- صفًّا موجّهًا للمستقبِل، فيصله عبر Realtime. الطبقة العميلة:
-- src/services/directMessages.ts + تكامل MessagesStore.

create table if not exists public.direct_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  sender_name text not null,
  recipient_name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

comment on table public.direct_messages is
  'رسائل مباشرة بين مستخدمين — المرسِل يكتب، والمستقبِل يستقبل عبر Realtime';

create index if not exists direct_messages_recipient_idx
  on public.direct_messages (recipient_id, created_at);
create index if not exists direct_messages_sender_idx
  on public.direct_messages (sender_id, created_at);

alter table public.direct_messages enable row level security;

-- القراءة: طرفا الرسالة فقط (المرسِل أو المستقبِل)
drop policy if exists "direct_messages_select" on public.direct_messages;
create policy "direct_messages_select"
  on public.direct_messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- الكتابة: لا يرسل أحد باسم غيره — sender_id لا بدّ أن يكون صاحب الجلسة
drop policy if exists "direct_messages_insert" on public.direct_messages;
create policy "direct_messages_insert"
  on public.direct_messages for insert
  with check (sender_id = auth.uid());

-- التحديث: المستقبِل وحده يعلّم رسائله مقروءة
drop policy if exists "direct_messages_update" on public.direct_messages;
create policy "direct_messages_update"
  on public.direct_messages for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Realtime: تسليم لحظي للمستقبِل
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;

alter table public.direct_messages replica identity full;
