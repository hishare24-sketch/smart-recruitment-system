-- ===== منظومة التوظيف الذكية — مخطط Supabase الأولي =====
-- يُنفَّذ مرة واحدة من لوحة Supabase: SQL Editor → New query → لصق وتشغيل.
--
-- المرحلة التجريبية: جدول واحد يحمل حالة الصفحة التعريفية العامة كاملة (jsonb)
-- بنفس شكل PublicProfileState في الواجهة — أبسط نقطة انطلاق للمزامنة،
-- وعند اعتماد Supabase Auth لاحقًا تُشدَّد السياسات إلى auth.uid().

create table if not exists public.public_profiles (
  slug text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.public_profiles is
  'حالة الصفحة التعريفية العامة لكل مستخدم — data تطابق PublicProfileState في الواجهة';

alter table public.public_profiles enable row level security;

-- سياسات المرحلة التجريبية (مفتاح anon):
-- القراءة عامة (الصفحة عامة بطبيعتها)، والكتابة مفتوحة مؤقتًا لأن المنصة
-- بلا Auth حقيقي بعد. عند تفعيل Supabase Auth تُستبدل سياسات الكتابة بشرط
-- (auth.uid() = owner_id) بعد إضافة عمود owner_id.
drop policy if exists "public_profiles_read" on public.public_profiles;
create policy "public_profiles_read"
  on public.public_profiles for select
  using (true);

drop policy if exists "public_profiles_insert_demo" on public.public_profiles;
create policy "public_profiles_insert_demo"
  on public.public_profiles for insert
  with check (true);

drop policy if exists "public_profiles_update_demo" on public.public_profiles;
create policy "public_profiles_update_demo"
  on public.public_profiles for update
  using (true);
