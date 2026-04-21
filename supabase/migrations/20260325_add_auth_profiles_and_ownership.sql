create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'member',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.clients
add column if not exists owner_user_id uuid references public.profiles(id) on delete set null;

alter table public.tasks
add column if not exists owner_user_id uuid references public.profiles(id) on delete set null;

alter table public.outputs
add column if not exists owner_user_id uuid references public.profiles(id) on delete set null;

alter table public.conversations
add column if not exists owner_user_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_clients_owner_user_id on public.clients (owner_user_id);
create index if not exists idx_tasks_owner_user_id on public.tasks (owner_user_id);
create index if not exists idx_outputs_owner_user_id on public.outputs (owner_user_id);
create index if not exists idx_conversations_owner_user_id on public.conversations (owner_user_id);
