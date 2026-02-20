-- Restrict self-service role assignment to student/lecturer.
-- Admin role must be assigned manually by the platform owner.
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

-- Keep existing profiles intact; only set lecturer from metadata where still default student.
update public.profiles as p
set
  role = case
    when p.role = 'student' and u.raw_user_meta_data->>'role' = 'lecturer' then 'lecturer'
    else p.role
  end,
  university = coalesce(nullif(p.university, ''), nullif(u.raw_user_meta_data->>'university', '')),
  department = coalesce(nullif(p.department, ''), nullif(u.raw_user_meta_data->>'department', '')),
  matric_number = coalesce(nullif(p.matric_number, ''), nullif(u.raw_user_meta_data->>'matric_number', '')),
  updated_at = now()
from auth.users as u
where p.id = u.id
  and (
    (p.role = 'student' and u.raw_user_meta_data->>'role' = 'lecturer')
    or ((p.university is null or p.university = '') and nullif(u.raw_user_meta_data->>'university', '') is not null)
    or ((p.department is null or p.department = '') and nullif(u.raw_user_meta_data->>'department', '') is not null)
    or ((p.matric_number is null or p.matric_number = '') and nullif(u.raw_user_meta_data->>'matric_number', '') is not null)
  );
