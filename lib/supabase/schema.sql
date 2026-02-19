-- ============================================================
-- UniBridge Supabase Schema
-- Run this in your Supabase SQL Editor to set up all tables.
-- ============================================================

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null default '',
  role text not null default 'student' check (role in ('student', 'lecturer', 'admin')),
  plan text not null default 'basic' check (plan in ('basic', 'premium', 'enterprise')),
  university text default 'University of Lagos',
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

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Lectures ─────────────────────────────────────────────────────────────────
create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  course_code text not null,
  lecturer_id uuid references public.profiles(id) on delete set null,
  lecturer_name text not null default '',
  university text not null default 'University of Lagos',
  department text not null default 'General',
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

-- ─── Resources ────────────────────────────────────────────────────────────────
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  type text not null check (type in ('notes', 'past-questions', 'study-guide', 'textbook', 'assignment')),
  course_code text not null,
  university text not null default 'University of Lagos',
  department text not null default 'General',
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

-- ─── Opportunities ────────────────────────────────────────────────────────────
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('scholarship', 'bursary', 'gig', 'internship', 'grant')),
  organization text not null,
  description text default '',
  amount decimal,
  currency text default 'NGN',
  deadline date not null,
  requirements text[] default '{}',
  skills text[] default '{}',
  location text default 'Nigeria',
  is_remote boolean default false,
  application_url text default '',
  tags text[] default '{}',
  created_at timestamptz default now()
);

alter table public.opportunities enable row level security;

create policy "Opportunities viewable by everyone"
  on public.opportunities for select using (true);

create policy "Admins can manage opportunities"
  on public.opportunities for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- ─── Notifications ────────────────────────────────────────────────────────────
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

-- ─── Chat Messages (Wellness) ─────────────────────────────────────────────────
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

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable realtime on key tables
alter publication supabase_realtime add table public.lectures;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.resources;
alter publication supabase_realtime add table public.chat_messages;

-- ─── Seed Data ────────────────────────────────────────────────────────────────
insert into public.lectures (title, course_code, lecturer_name, university, department, scheduled_at, duration, is_live, is_recorded, description, tags, offline_available)
values
  ('Introduction to Data Structures', 'CSC 201', 'Dr. Adeyemi Okafor', 'University of Lagos', 'Computer Science', now() + interval '2 hours', 90, false, false, 'Covers stacks, queues, and tree traversal with BFS and DFS examples.', ARRAY['data-structures', 'algorithms', 'csc201'], true),
  ('Advanced Database Systems', 'CSC 401', 'Prof. Ngozi Eze', 'University of Lagos', 'Computer Science', now() + interval '1 day', 120, false, false, 'SQL optimization, indexing strategies, and NoSQL alternatives.', ARRAY['database', 'sql', 'nosql', 'csc401'], false),
  ('Engineering Mathematics III', 'ENG 301', 'Dr. Seun Adebayo', 'University of Lagos', 'Engineering', now() - interval '1 hour', 90, true, false, 'Live session covering Laplace transforms and Fourier series.', ARRAY['mathematics', 'engineering', 'eng301'], false),
  ('Microeconomics Principles', 'ECO 101', 'Dr. Amaka Obiora', 'University of Lagos', 'Economics', now() - interval '3 days', 60, false, true, 'Supply and demand, elasticity, and market structures.', ARRAY['economics', 'micro', 'eco101'], true),
  ('Introduction to Sociology', 'SOC 101', 'Prof. Bello Hassan', 'University of Lagos', 'Social Sciences', now() + interval '3 hours', 75, false, false, 'Socialization, culture, and social stratification.', ARRAY['sociology', 'social-sciences', 'soc101'], false);

insert into public.opportunities (title, type, organization, description, amount, currency, deadline, requirements, skills, location, is_remote, application_url, tags)
values
  ('UNILAG Micro Scholarship for STEM Students', 'scholarship', 'Lagos EduFund', 'Monthly micro-grant for students in engineering and computer science with strong project portfolios.', 120000, 'NGN', current_date + interval '22 days', ARRAY['STEM student', 'portfolio', 'minimum CGPA 3.2/5'], ARRAY['python', 'data analysis', 'research writing'], 'Lagos', true, 'https://lagosledufund.example.org/apply', ARRAY['unilag', 'stem', 'grant', 'micro-scholarship']),
  ('Campus Tutor Gig - Economics 101', 'gig', 'PeerLift NG', 'Part-time tutoring for 100-level economics students. Weekly payment and flexible evening schedule.', 30000, 'NGN', current_date + interval '11 days', ARRAY['teaching ability', 'economics basics', 'communication'], ARRAY['teaching', 'economics', 'communication'], 'Lagos', false, 'https://peerlift.example.org/econ-tutor', ARRAY['tutoring', 'gig', 'economics']),
  ('Remote Frontend Internship (Student Friendly)', 'internship', 'Andela Talent Labs', 'Remote internship for students with React and TypeScript knowledge. Includes mentorship and stipend.', 150000, 'NGN', current_date + interval '27 days', ARRAY['portfolio', 'react basics', 'git workflow'], ARRAY['react', 'typescript', 'git', 'ui design'], 'Remote', true, 'https://andela.example.org/frontend-intern', ARRAY['internship', 'remote', 'frontend']),
  ('Research Assistant Bursary - Social Sciences', 'bursary', 'EduBridge NGO', 'Research support bursary for students working on community development and public policy projects.', 90000, 'NGN', current_date + interval '37 days', ARRAY['proposal', 'community project', 'report writing'], ARRAY['research writing', 'statistics', 'project planning'], 'Ibadan', true, 'https://edubridge.example.org/bursary', ARRAY['bursary', 'social science', 'research']),
  ('Freelance Graphics Design Gig for Student Clubs', 'gig', 'Campus Creators Hub', 'Design social media flyers and event banners for university clubs and departments.', 45000, 'NGN', current_date + interval '19 days', ARRAY['portfolio', 'deadline management'], ARRAY['figma', 'graphic design', 'branding'], 'Abuja', true, 'https://campuscreators.example.org/design', ARRAY['design', 'gig', 'creative']),
  ('TETFund National Research Grant', 'grant', 'TETFund Nigeria', 'Research funding for postgraduate students and lecturers conducting original academic research.', 500000, 'NGN', current_date + interval '45 days', ARRAY['postgraduate enrollment', 'research proposal', 'supervisor signature'], ARRAY['research', 'academic writing', 'data analysis'], 'Nigeria', false, 'https://tetfund.example.org/grant', ARRAY['grant', 'research', 'postgraduate']);

insert into public.resources (title, description, type, course_code, university, department, uploader_name, file_url, file_size, downloads, rating, review_count, tags, is_premium, is_verified, is_approved, year)
values
  ('CSC 201 Comprehensive Notes – 2025', 'Full semester notes covering all topics from the course outline with solved examples.', 'notes', 'CSC 201', 'University of Lagos', 'Computer Science', 'Chidi Okonkwo', 'https://example.com/csc201-notes.pdf', 2457600, 234, 4.7, 45, ARRAY['data-structures', 'csc201', 'algorithms'], false, true, true, 2025),
  ('ECO 101 Past Questions 2020-2025', '5-year compilation of past exam questions with model answers for Microeconomics.', 'past-questions', 'ECO 101', 'University of Lagos', 'Economics', 'Fatima Bello', 'https://example.com/eco101-pq.pdf', 1843200, 567, 4.9, 89, ARRAY['economics', 'eco101', 'past-questions'], false, true, true, 2025),
  ('Data Structures Study Guide', 'Comprehensive study guide covering stacks, queues, trees, graphs, and sorting algorithms.', 'study-guide', 'CSC 201', 'University of Lagos', 'Computer Science', 'Amara Nwosu', 'https://example.com/ds-guide.pdf', 3145728, 123, 4.5, 28, ARRAY['data-structures', 'algorithms', 'study-guide'], true, true, true, 2025),
  ('ENG 301 Lab Manual', 'Engineering Mathematics lab manual with step-by-step solved problems for Laplace transforms.', 'textbook', 'ENG 301', 'University of Lagos', 'Engineering', 'Bola Adeleke', 'https://example.com/eng301-lab.pdf', 5242880, 89, 4.3, 17, ARRAY['mathematics', 'engineering', 'eng301'], false, true, true, 2024),
  ('SOC 101 Assignment Templates', 'Ready-to-use assignment templates for common sociology essay formats.', 'assignment', 'SOC 101', 'University of Lagos', 'Social Sciences', 'Kemi Oduola', 'https://example.com/soc101-templates.docx', 614400, 45, 4.1, 9, ARRAY['sociology', 'assignment', 'soc101'], false, false, true, 2025);
