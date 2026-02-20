-- UniBridge migration: live lecture sessions + student opportunities + gamification support
-- Run this once in Supabase SQL editor for existing projects.

alter table if exists public.opportunities
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists submitted_by_name text default '',
  add column if not exists is_approved boolean default true;

create index if not exists opportunities_created_by_idx on public.opportunities(created_by);
create index if not exists opportunities_deadline_idx on public.opportunities(deadline);

-- Replace opportunities policies with submission-aware rules.
drop policy if exists "Opportunities viewable by everyone" on public.opportunities;
drop policy if exists "Authenticated users can submit opportunities" on public.opportunities;
drop policy if exists "Users can update their own opportunities" on public.opportunities;

create policy "Opportunities viewable by everyone"
  on public.opportunities for select
  using (
    is_approved = true
    or auth.uid() = created_by
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Authenticated users can submit opportunities"
  on public.opportunities for insert
  with check (auth.uid() = created_by);

create policy "Users can update their own opportunities"
  on public.opportunities for update
  using (auth.uid() = created_by);

-- Ensure lecture admin policy exists.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lectures'
      and policyname = 'Admins can manage lectures'
  ) then
    create policy "Admins can manage lectures"
      on public.lectures for all
      using (exists (
        select 1 from public.profiles where id = auth.uid() and role = 'admin'
      ));
  end if;
end $$;

-- Ensure realtime publication includes opportunities table.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'opportunities'
  ) then
    alter publication supabase_realtime add table public.opportunities;
  end if;
end $$;
