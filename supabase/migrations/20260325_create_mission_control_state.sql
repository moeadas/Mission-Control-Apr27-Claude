create table if not exists public.mission_control_state (
  agency_id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.set_mission_control_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists mission_control_state_set_updated_at on public.mission_control_state;

create trigger mission_control_state_set_updated_at
before update on public.mission_control_state
for each row
execute function public.set_mission_control_state_updated_at();
