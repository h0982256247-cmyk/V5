-- Flex Share Studio: full schema (single-admin friendly)
-- Run in Supabase SQL editor as the database owner role (usually `postgres`).

create extension if not exists pgcrypto;

-- 1) Roles (enum + function)
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' and t.typname='app_role'
  ) then
    create type public.app_role as enum ('admin', 'user');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role = _role
  );
$$;

-- Only admin can read/manage roles
drop policy if exists "Admin manage roles" on public.user_roles;
create policy "Admin manage roles"
on public.user_roles
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Helpers
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3) Core tables
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'draft',
  version int not null default 1,
  template_text text not null,
  schema jsonb not null default '{}'::jsonb,
  sample_data jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.docs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  template_id uuid references public.templates(id) on delete restrict,
  data jsonb not null default '{}'::jsonb,
  mode text not null default 'single',
  status text not null default 'draft',
  preview_json jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  is_valid boolean not null default false,
  last_validated_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.share_links (
  token text primary key,
  doc_id uuid not null references public.docs(id) on delete cascade,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  access_count int not null default 0,
  last_accessed_at timestamptz
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'image',
  url text not null,
  width int,
  height int,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 4) Triggers
drop trigger if exists update_templates_updated_at on public.templates;
create trigger update_templates_updated_at
before update on public.templates
for each row execute function public.update_updated_at_column();

drop trigger if exists update_docs_updated_at on public.docs;
create trigger update_docs_updated_at
before update on public.docs
for each row execute function public.update_updated_at_column();

-- 5) Indexes
create index if not exists idx_share_links_doc_id on public.share_links(doc_id);
create index if not exists idx_docs_template_id on public.docs(template_id);
create index if not exists docs_status_idx on public.docs(status);

-- 6) RLS
alter table public.templates enable row level security;
alter table public.docs enable row level security;
alter table public.share_links enable row level security;
alter table public.assets enable row level security;

-- Admin-only access to core tables
drop policy if exists "Admin full access templates" on public.templates;
create policy "Admin full access templates"
on public.templates for all
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admin full access docs" on public.docs;
create policy "Admin full access docs"
on public.docs for all
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admin full access share_links" on public.share_links;
create policy "Admin full access share_links"
on public.share_links for all
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admin full access assets" on public.assets;
create policy "Admin full access assets"
on public.assets for all
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 7) Public share RPCs (no public SELECT policies required)
create or replace function public.record_share_link_access(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.share_links
  set access_count = access_count + 1,
      last_accessed_at = now()
  where token = p_token;
  return found;
end;
$$;

create or replace function public.get_public_doc_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.share_links%rowtype;
  d public.docs%rowtype;
  t public.templates%rowtype;
begin
  select * into link from public.share_links where token = p_token;
  if not found then
    return null;
  end if;

  if link.expires_at is not null and link.expires_at < now() then
    return null;
  end if;

  select * into d from public.docs where id = link.doc_id and status = 'published';
  if not found then
    return null;
  end if;

  select * into t from public.templates where id = d.template_id;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'share_link', to_jsonb(link),
    'doc', to_jsonb(d),
    'template', to_jsonb(t)
  );
end;
$$;

grant execute on function public.record_share_link_access(text) to anon, authenticated;
grant execute on function public.get_public_doc_by_token(text) to anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to anon, authenticated;

-- 8) Storage bucket + policies (best-effort)
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'assets') then
    insert into storage.buckets (id, name, public)
    values ('assets', 'assets', true);
  end if;
exception when others then
  raise notice 'Skipping storage bucket creation (insufficient privilege?)';
end $$;

do $$
begin
  execute 'drop policy if exists "Public read assets" on storage.objects';
  execute $$create policy "Public read assets"
    on storage.objects for select
    using (bucket_id = 'assets')$$;

  execute 'drop policy if exists "Admin write assets" on storage.objects';
  execute $$create policy "Admin write assets"
    on storage.objects for insert
    with check (bucket_id = 'assets' and public.has_role(auth.uid(), 'admin'::public.app_role))$$;

  execute 'drop policy if exists "Admin update assets" on storage.objects';
  execute $$create policy "Admin update assets"
    on storage.objects for update
    using (bucket_id = 'assets' and public.has_role(auth.uid(), 'admin'::public.app_role))
    with check (bucket_id = 'assets' and public.has_role(auth.uid(), 'admin'::public.app_role))$$;

  execute 'drop policy if exists "Admin delete assets" on storage.objects';
  execute $$create policy "Admin delete assets"
    on storage.objects for delete
    using (bucket_id = 'assets' and public.has_role(auth.uid(), 'admin'::public.app_role))$$;
exception when insufficient_privilege then
  raise notice 'Skipping storage.objects policies (not table owner). Use Dashboard → Storage → Policies instead.';
end $$;
