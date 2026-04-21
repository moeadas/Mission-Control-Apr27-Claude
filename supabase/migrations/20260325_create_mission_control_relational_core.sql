create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.agents (
  id text primary key,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  role text not null,
  division text not null,
  specialty text not null,
  unit text not null,
  status text not null default 'idle',
  bio text not null default '',
  methodology text not null default '',
  system_prompt text not null default '',
  provider text not null default 'ollama',
  model text not null default 'minimax-m2.7:cloud',
  temperature numeric(4,3) not null default 0.7,
  max_tokens integer not null default 1024,
  color text not null default '#4f8ef7',
  accent_color text not null default 'blue',
  avatar text not null default 'bot-blue',
  photo_url text,
  current_task text,
  workload integer,
  last_active timestamptz,
  tools jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  responsibilities jsonb not null default '[]'::jsonb,
  primary_outputs jsonb not null default '[]'::jsonb,
  position jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.clients (
  id text primary key,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  industry text,
  website text,
  status text not null default 'active',
  brief jsonb not null default '{}'::jsonb,
  knowledge_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.skills (
  id text primary key,
  agency_id uuid references public.agencies(id) on delete cascade,
  name text not null,
  category text not null,
  description text not null default '',
  prompts jsonb not null default '{}'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  examples jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'config',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.agent_skill_links (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  skill_id text not null references public.skills(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (agency_id, agent_id, skill_id)
);

create table if not exists public.pipelines (
  id text primary key,
  agency_id uuid references public.agencies(id) on delete cascade,
  name text not null,
  description text not null default '',
  version text not null default '1.0',
  is_default boolean not null default false,
  estimated_duration text,
  definition jsonb not null default '{}'::jsonb,
  source text not null default 'config',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.tasks (
  id text primary key,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id text references public.clients(id) on delete set null,
  title text not null,
  summary text not null default '',
  deliverable_type text not null,
  status text not null default 'queued',
  priority text not null default 'medium',
  assigned_by text,
  lead_agent_id text references public.agents(id) on delete set null,
  pipeline_id text references public.pipelines(id) on delete set null,
  progress integer not null default 0,
  due_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  execution_plan jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  role text not null default 'support',
  status text not null default 'queued',
  handoff_notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (task_id, agent_id, role)
);

create table if not exists public.task_runs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  agent_id text references public.agents(id) on delete set null,
  stage text not null,
  status text not null default 'queued',
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.outputs (
  id text primary key,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  task_id text references public.tasks(id) on delete cascade,
  client_id text references public.clients(id) on delete set null,
  agent_id text references public.agents(id) on delete set null,
  title text not null,
  deliverable_type text not null,
  status text not null default 'draft',
  format text not null default 'html',
  content text,
  rendered_html text,
  source_prompt text,
  notes text,
  storage_path text,
  public_url text,
  creative jsonb not null default '{}'::jsonb,
  exports jsonb not null default '[]'::jsonb,
  execution_steps jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.conversations (
  id text primary key,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id text references public.clients(id) on delete set null,
  task_id text references public.tasks(id) on delete set null,
  title text not null,
  preview text,
  agent_id text references public.agents(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.messages (
  id text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  role text not null,
  agent_id text references public.agents(id) on delete set null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  pipeline_id text references public.pipelines(id) on delete set null,
  task_id text references public.tasks(id) on delete cascade,
  status text not null default 'active',
  current_phase text,
  progress integer not null default 0,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.knowledge_assets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id text references public.clients(id) on delete cascade,
  title text not null,
  asset_type text not null default 'document',
  storage_bucket text,
  storage_path text,
  public_url text,
  extracted_text text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_agents_agency_id on public.agents (agency_id);
create index if not exists idx_clients_agency_id on public.clients (agency_id);
create index if not exists idx_skills_agency_id on public.skills (agency_id);
create index if not exists idx_pipelines_agency_id on public.pipelines (agency_id);
create index if not exists idx_tasks_agency_id on public.tasks (agency_id);
create index if not exists idx_tasks_client_id on public.tasks (client_id);
create index if not exists idx_tasks_status on public.tasks (status);
create index if not exists idx_task_assignments_task_id on public.task_assignments (task_id);
create index if not exists idx_task_runs_task_id on public.task_runs (task_id);
create index if not exists idx_outputs_task_id on public.outputs (task_id);
create index if not exists idx_outputs_client_id on public.outputs (client_id);
create index if not exists idx_conversations_client_id on public.conversations (client_id);
create index if not exists idx_messages_conversation_id on public.messages (conversation_id);
create index if not exists idx_workflow_instances_task_id on public.workflow_instances (task_id);
create index if not exists idx_knowledge_assets_client_id on public.knowledge_assets (client_id);

drop trigger if exists agencies_set_updated_at on public.agencies;
create trigger agencies_set_updated_at before update on public.agencies for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists agents_set_updated_at on public.agents;
create trigger agents_set_updated_at before update on public.agents for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists skills_set_updated_at on public.skills;
create trigger skills_set_updated_at before update on public.skills for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists pipelines_set_updated_at on public.pipelines;
create trigger pipelines_set_updated_at before update on public.pipelines for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists task_assignments_set_updated_at on public.task_assignments;
create trigger task_assignments_set_updated_at before update on public.task_assignments for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists task_runs_set_updated_at on public.task_runs;
create trigger task_runs_set_updated_at before update on public.task_runs for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists outputs_set_updated_at on public.outputs;
create trigger outputs_set_updated_at before update on public.outputs for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists workflow_instances_set_updated_at on public.workflow_instances;
create trigger workflow_instances_set_updated_at before update on public.workflow_instances for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists knowledge_assets_set_updated_at on public.knowledge_assets;
create trigger knowledge_assets_set_updated_at before update on public.knowledge_assets for each row execute function public.set_current_timestamp_updated_at();

insert into public.agencies (slug, name)
values ('default-agency', 'Default Agency')
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public)
values
  ('agent-avatars', 'agent-avatars', true),
  ('knowledge-docs', 'knowledge-docs', false),
  ('task-exports', 'task-exports', false),
  ('creative-assets', 'creative-assets', true)
on conflict (id) do nothing;
