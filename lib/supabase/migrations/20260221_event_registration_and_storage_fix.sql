-- UniBridge migration: event registration, host attendee view, and storage upload reliability

-- 1) Extend events with host-facing metadata and shareable registration link.
alter table if exists public.student_events
  add column if not exists general_registration_url text default '',
  add column if not exists faculty_hosting text default '',
  add column if not exists sponsors text[] default '{}';

-- 2) Event registrations table so students can register and hosts can track attendees.
create table if not exists public.student_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.student_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attendee_name text default '',
  attendee_email text default '',
  created_at timestamptz default now(),
  unique (event_id, user_id)
);

create index if not exists student_event_registrations_event_idx
  on public.student_event_registrations(event_id);
create index if not exists student_event_registrations_user_idx
  on public.student_event_registrations(user_id);

alter table if exists public.student_event_registrations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_event_registrations'
      and policyname = 'Users can register for events'
  ) then
    create policy "Users can register for events"
      on public.student_event_registrations for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_event_registrations'
      and policyname = 'Users can view own registrations and hosts can view attendees'
  ) then
    create policy "Users can view own registrations and hosts can view attendees"
      on public.student_event_registrations for select
      using (
        auth.uid() = user_id
        or exists (
          select 1 from public.student_events e
          where e.id = event_id and e.created_by = auth.uid()
        )
        or exists (
          select 1 from public.profiles where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_event_registrations'
      and policyname = 'Users can cancel own registrations'
  ) then
    create policy "Users can cancel own registrations"
      on public.student_event_registrations for delete
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_event_registrations'
      and policyname = 'Hosts and admins can remove attendees'
  ) then
    create policy "Hosts and admins can remove attendees"
      on public.student_event_registrations for delete
      using (
        exists (
          select 1 from public.student_events e
          where e.id = event_id and e.created_by = auth.uid()
        )
        or exists (
          select 1 from public.profiles where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'student_event_registrations'
  ) then
    alter publication supabase_realtime add table public.student_event_registrations;
  end if;
end $$;

-- 3) Ensure resources storage bucket and auth policies exist for profile/video uploads.
insert into storage.buckets (id, name, public, file_size_limit)
values ('resources', 'resources', true, 104857600)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read resources bucket'
  ) then
    create policy "Public can read resources bucket"
      on storage.objects for select
      using (bucket_id = 'resources');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated can upload resources bucket'
  ) then
    create policy "Authenticated can upload resources bucket"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'resources');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated can update resources bucket'
  ) then
    create policy "Authenticated can update resources bucket"
      on storage.objects for update
      to authenticated
      using (bucket_id = 'resources')
      with check (bucket_id = 'resources');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated can delete resources bucket'
  ) then
    create policy "Authenticated can delete resources bucket"
      on storage.objects for delete
      to authenticated
      using (bucket_id = 'resources');
  end if;
end $$;
