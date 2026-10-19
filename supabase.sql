-- شغّل هذا الملف مرة واحدة في Supabase → SQL Editor
-- النتيجة: أي زائر يستطيع إرسال إجابة فقط، ولا يستطيع قراءة أو تعديل أي إجابة.
-- القراءة والحذف للحسابات المسجلة في جدول admins فقط.

create table if not exists public.responses (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  answers jsonb not null check (jsonb_typeof(answers) = 'object' and length(answers::text) < 20000)
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.responses enable row level security;
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- الصلاحيات: الزائر يُدخل عمود answers فقط، ولا يصل إلى جدول admins إطلاقًا
revoke all on public.responses from anon, authenticated;
revoke all on public.admins from anon, authenticated;
grant insert (answers) on public.responses to anon, authenticated;
grant select, delete on public.responses to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "anyone can submit" on public.responses;
create policy "anyone can submit" on public.responses
  for insert to anon, authenticated with check (true);

drop policy if exists "admins can read" on public.responses;
create policy "admins can read" on public.responses
  for select to authenticated using (public.is_admin());

drop policy if exists "admins can delete" on public.responses;
create policy "admins can delete" on public.responses
  for delete to authenticated using (public.is_admin());


-- ===== بعد إنشاء حسابك في Authentication → Users =====
-- ضع بريدك مكان النص التالي وشغّل هذا السطر وحده:
-- insert into public.admins (user_id) select id from auth.users where email = 'your-email@example.com';
