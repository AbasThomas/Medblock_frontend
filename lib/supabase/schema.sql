-- ============================================================
-- UniBridge Supabase Schema
-- Run this in your Supabase SQL Editor to set up all tables.
-- ============================================================

-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null default '',
  role text not null default 'student' check (role in ('student', 'lecturer', 'admin')),
  plan text not null default 'basic' check (plan in ('basic', 'premium', 'enterprise')),
  university text,
  matric_number text,
  department text,
  bio text,
  avatar text,
  points integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Authenticated users can view public profiles"
  on public.profiles for select using (auth.role() = 'authenticated');

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, university, department, matric_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data->>'role' in ('student', 'lecturer')
      then new.raw_user_meta_data->>'role'
      else 'student'
    end,
    nullif(new.raw_user_meta_data->>'university', ''),
    nullif(new.raw_user_meta_data->>'department', ''),
    nullif(new.raw_user_meta_data->>'matric_number', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  course_code text not null,
  lecturer_id uuid references public.profiles(id) on delete set null,
  lecturer_name text not null default '',
  university text not null default '',
  department text not null default '',
  scheduled_at timestamptz not null default now(),
  duration integer default 60,
  is_live boolean default false,
  is_recorded boolean default false,
  recording_url text,
  stream_url text,
  attendees integer default 0,
  description text,
  tags text[] default '{}',
  summary text,
  offline_available boolean default false,
  created_at timestamptz default now()
);

alter table public.lectures enable row level security;

create policy "Lectures are viewable by everyone"
  on public.lectures for select using (true);

create policy "Lecturers can insert lectures"
  on public.lectures for insert
  with check (auth.uid() = lecturer_id);

create policy "Lecturers can update their own lectures"
  on public.lectures for update
  using (auth.uid() = lecturer_id);

create policy "Admins can manage lectures"
  on public.lectures for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- ------------------------------------------------------------
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  type text not null check (type in ('notes', 'past-questions', 'study-guide', 'textbook', 'assignment')),
  course_code text not null,
  university text not null default '',
  department text not null default '',
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploader_name text default '',
  file_url text default '',
  file_size bigint default 0,
  downloads integer default 0,
  rating decimal(3,2) default 0,
  review_count integer default 0,
  tags text[] default '{}',
  is_premium boolean default false,
  is_verified boolean default false,
  is_approved boolean default false,
  year integer default extract(year from now())::integer,
  created_at timestamptz default now()
);

alter table public.resources enable row level security;

create policy "Approved resources viewable by everyone"
  on public.resources for select using (is_approved = true or auth.uid() = uploaded_by);

create policy "Authenticated users can upload resources"
  on public.resources for insert with check (auth.uid() = uploaded_by);

create policy "Uploaders can update their resources"
  on public.resources for update using (auth.uid() = uploaded_by);

-- Admin can see all resources (including unapproved)
create policy "Admins can view all resources"
  on public.resources for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Admins can update any resource"
  on public.resources for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Admins can delete resources"
  on public.resources for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Function to increment downloads safely
create or replace function public.increment_downloads(resource_id uuid)
returns void as $$
begin
  update public.resources set downloads = downloads + 1 where id = resource_id;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('scholarship', 'bursary', 'gig', 'internship', 'grant')),
  organization text not null,
  created_by uuid references public.profiles(id) on delete set null,
  submitted_by_name text default '',
  is_approved boolean default true,
  description text default '',
  amount decimal,
  currency text default 'NGN',
  deadline date not null,
  requirements text[] default '{}',
  skills text[] default '{}',
  location text default 'Nigeria',
  is_remote boolean default false,
  application_url text default '',
  contact_person text default '',
  contact_link text default '',
  tags text[] default '{}',
  created_at timestamptz default now()
);

alter table public.opportunities enable row level security;

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

create policy "Admins can manage opportunities"
  on public.opportunities for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- ------------------------------------------------------------
create table if not exists public.student_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text default '',
  location text not null default '',
  event_date timestamptz not null,
  rsvp_url text default '',
  general_registration_url text default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_by_name text default '',
  university text default '',
  faculty_hosting text default '',
  sponsors text[] default '{}',
  is_virtual boolean default false,
  created_at timestamptz default now()
);

alter table public.student_events enable row level security;

create policy "Student events viewable by everyone"
  on public.student_events for select using (true);

create policy "Authenticated users can create student events"
  on public.student_events for insert
  with check (auth.uid() = created_by);

create policy "Users can update their own student events"
  on public.student_events for update
  using (auth.uid() = created_by);

create policy "Users can delete their own student events"
  on public.student_events for delete
  using (auth.uid() = created_by);

create policy "Admins can manage student events"
  on public.student_events for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- ------------------------------------------------------------
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

alter table public.student_event_registrations enable row level security;

create policy "Users can register for events"
  on public.student_event_registrations for insert
  with check (auth.uid() = user_id);

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

create policy "Users can cancel own registrations"
  on public.student_event_registrations for delete
  using (auth.uid() = user_id);

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

-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text default 'info' check (type in ('info', 'success', 'warning', 'error')),
  read boolean default false,
  link text,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update using (auth.uid() = user_id);

-- ------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  mood text,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;

create policy "Users can view their own chat messages"
  on public.chat_messages for select using (auth.uid() = user_id);

create policy "Users can insert their own chat messages"
  on public.chat_messages for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Enable realtime on key tables
alter publication supabase_realtime add table public.lectures;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.resources;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.opportunities;
alter publication supabase_realtime add table public.student_events;
alter publication supabase_realtime add table public.student_event_registrations;

-- ------------------------------------------------------------
-- Storage setup for profile images/videos/resources
insert into storage.buckets (id, name, public, file_size_limit)
values ('resources', 'resources', true, 104857600)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create policy "Public can read resources bucket"
  on storage.objects for select
  using (bucket_id = 'resources');

create policy "Authenticated can upload resources bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resources');

create policy "Authenticated can update resources bucket"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'resources')
  with check (bucket_id = 'resources');

create policy "Authenticated can delete resources bucket"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'resources');
