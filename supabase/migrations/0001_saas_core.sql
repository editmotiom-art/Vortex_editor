-- ============================================================
--  VORTEX · Núcleo SaaS  (Supabase / Postgres)
--  Regra estrutural: aqui vive METADADO. Mídia vai para R2/B2/HD.
--  Rodar: supabase db push   |   ou colar no SQL Editor
-- ============================================================

create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. PERFIS
-- ------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  plan        text not null default 'free' check (plan in ('free','pro','studio')),
  created_at  timestamptz default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- 2. ASSINATURAS  (fonte da verdade do acesso)
-- ------------------------------------------------------------
create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  provider              text not null default 'stripe',   -- stripe|mercadopago|manual
  provider_customer_id  text,
  provider_sub_id       text,
  plan                  text not null default 'pro',
  status                text not null default 'inactive', -- active|trialing|past_due|canceled|inactive
  current_period_end    timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  unique (user_id)
);

-- função usada pelo RLS e pelas Edge Functions
create or replace function is_pro(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions s
    where s.user_id = uid
      and s.status in ('active','trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  ) or exists (select 1 from profiles p where p.id = uid and p.plan in ('pro','studio'));
$$;

-- ------------------------------------------------------------
-- 3. PROJETOS  (o documento do editor — JSONB, versionado)
-- ------------------------------------------------------------
create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null default 'Projeto sem título',
  doc_version  int  not null default 1,
  doc          jsonb not null default '{}'::jsonb,  -- ProjectDoc (sem bytes de mídia)
  thumbnail_key text,
  duration_ms  int default 0,
  width        int default 1080,
  height       int default 1920,
  fps          int default 30,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists projects_user_idx on projects (user_id, updated_at desc);
create index if not exists projects_name_trgm on projects using gin (name gin_trgm_ops);

-- histórico de versões (permite "voltar 20 minutos")
create table if not exists project_versions (
  id          bigserial primary key,
  project_id  uuid not null references projects(id) on delete cascade,
  doc         jsonb not null,
  created_at  timestamptz default now()
);
create index if not exists pv_project_idx on project_versions (project_id, created_at desc);

-- ------------------------------------------------------------
-- 4. LICENÇAS  (obrigatório para conteúdo oficial)
-- ------------------------------------------------------------
create table if not exists licenses (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  source_url          text,
  author              text,
  allows_commercial   boolean default false,
  allows_redistribute boolean default false,   -- pode ir dentro do app/pack?
  proof_key           text,
  notes               text,
  created_at          timestamptz default now()
);

-- ------------------------------------------------------------
-- 5. ASSETS  (metadados da biblioteca — nunca bytes)
-- ------------------------------------------------------------
create table if not exists assets (
  id            uuid primary key default gen_random_uuid(),
  hash          text unique,
  kind          text not null,                 -- video|audio|image|vector|font|lut|project|3d
  ext           text,
  name          text not null,
  bytes         bigint not null default 0,
  duration_ms   int,
  width         int,
  height        int,
  fps           numeric(8,3),
  vcodec        text,
  acodec        text,
  category      text,
  tags          text[] default '{}',
  palette       text[] default '{}',
  -- endereços (chaves de storage, nunca o arquivo)
  storage_key   text,
  thumb_key     text,
  wave_key      text,
  preview_key   text,
  proxy_key     text,
  -- governança
  pack_id       uuid,
  license_id    uuid references licenses(id) on delete set null,
  visibility    text not null default 'official' check (visibility in ('official','pack','private')),
  created_at    timestamptz default now()
);
create index if not exists assets_kind_idx on assets (kind);
create index if not exists assets_cat_idx on assets (category);
create index if not exists assets_tags_idx on assets using gin (tags);
create index if not exists assets_trgm_idx on assets using gin (name gin_trgm_ops);

-- trava: conteúdo oficial exige licença que permita redistribuição
create or replace function enforce_official_license()
returns trigger language plpgsql as $$
begin
  if new.visibility = 'official' then
    if new.license_id is null then
      raise exception 'Asset oficial exige license_id';
    end if;
    if not exists (select 1 from licenses where id = new.license_id and allows_redistribute) then
      raise exception 'Licença não permite redistribuição dentro do produto';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_official_license on assets;
create trigger trg_official_license
  before insert or update on assets
  for each row execute function enforce_official_license();

-- ------------------------------------------------------------
-- 6. PACKS  (distribuição sob demanda — o pulo do gato do custo)
-- ------------------------------------------------------------
create table if not exists packs (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  description   text,
  cover_key     text,
  bytes_total   bigint default 0,
  items_count   int default 0,
  version       text default '1.0.0',
  requires_plan text default 'pro' check (requires_plan in ('free','pro','studio')),
  is_free       boolean default false,
  download_url  text,          -- URL assinada/expirada gerada por Edge Function
  checksum      text,
  published     boolean default false,
  created_at    timestamptz default now()
);

alter table assets
  drop constraint if exists assets_pack_fk,
  add constraint assets_pack_fk foreign key (pack_id) references packs(id) on delete set null;

-- quem instalou o quê
create table if not exists user_packs (
  user_id     uuid references auth.users(id) on delete cascade,
  pack_id     uuid references packs(id) on delete cascade,
  installed_at timestamptz default now(),
  primary key (user_id, pack_id)
);

-- ------------------------------------------------------------
-- 7. PROJETOS EXTERNOS  (Alight Motion .xml e cia.)
-- ------------------------------------------------------------
create table if not exists external_projects (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid references assets(id) on delete cascade,
  format        text not null,          -- alight-motion|aep|mogrt|kdenlive|fcpxml
  app_version   text,
  title         text,
  width         int,
  height        int,
  fps           int,
  total_ms      int,
  media_refs    int default 0,
  needs_relink  boolean default false,  -- selo "Requer relink" na galeria
  effects       text[] default '{}',
  layers        int default 0,
  compatible    numeric(4,3) default 0, -- % de efeitos mapeados
  imported_doc  jsonb,
  created_at    timestamptz default now()
);
create index if not exists ext_proj_relink_idx on external_projects (needs_relink);

-- ------------------------------------------------------------
-- 8. USO / TELEMETRIA  (base para recomendação e cobrança por uso)
-- ------------------------------------------------------------
create table if not exists asset_usage (
  user_id   uuid references auth.users(id) on delete cascade,
  asset_id  uuid references assets(id) on delete cascade,
  uses      int default 1,
  last_used timestamptz default now(),
  primary key (user_id, asset_id)
);

create table if not exists render_jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  project_id   uuid references projects(id) on delete set null,
  status       text default 'queued' check (status in ('queued','running','done','error')),
  format       text,
  resolution   text,
  output_key   text,
  error        text,
  created_at   timestamptz default now(),
  finished_at  timestamptz
);

-- ------------------------------------------------------------
-- 9. COLEÇÕES (a sidebar do editor)
-- ------------------------------------------------------------
create table if not exists collections (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  parent_slug text,
  cover_key   text,
  sort        int default 0
);
create table if not exists collection_items (
  collection_id uuid references collections(id) on delete cascade,
  asset_id      uuid references assets(id) on delete cascade,
  primary key (collection_id, asset_id)
);

-- ------------------------------------------------------------
-- 10. RLS
-- ------------------------------------------------------------
alter table profiles          enable row level security;
alter table subscriptions     enable row level security;
alter table projects          enable row level security;
alter table project_versions  enable row level security;
alter table assets            enable row level security;
alter table packs             enable row level security;
alter table user_packs        enable row level security;
alter table asset_usage       enable row level security;
alter table render_jobs       enable row level security;
alter table collections       enable row level security;
alter table collection_items  enable row level security;
alter table licenses          enable row level security;
alter table external_projects enable row level security;

-- perfis
create policy "perfil proprio: ver"    on profiles for select using (auth.uid() = id);
create policy "perfil proprio: editar" on profiles for update using (auth.uid() = id);

-- assinaturas: usuário só LÊ a própria (escrita é via service_role/webhook)
create policy "assinatura propria: ver" on subscriptions for select using (auth.uid() = user_id);

-- projetos
create policy "projetos: dono ve"    on projects for select using (auth.uid() = user_id);
create policy "projetos: dono cria"  on projects for insert with check (auth.uid() = user_id);
create policy "projetos: dono edita" on projects for update using (auth.uid() = user_id);
create policy "projetos: dono apaga" on projects for delete using (auth.uid() = user_id);

create policy "versoes: dono" on project_versions for all
  using (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()));

-- catálogo: todo mundo lê o oficial; packs exigem plano
create policy "catalogo: oficial publico" on assets for select
  using (visibility = 'official' or (visibility = 'pack' and is_pro()));

create policy "packs: listados" on packs for select using (published = true);
create policy "packs: usuario ve os seus" on user_packs for select using (auth.uid() = user_id);
create policy "packs: usuario instala" on user_packs for insert with check (auth.uid() = user_id and is_pro());

create policy "colecoes: publicas" on collections for select using (true);
create policy "colecao_itens: publicos" on collection_items for select using (true);

create policy "uso: proprio" on asset_usage for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "render: proprio" on render_jobs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "licencas: leitura autenticada" on licenses for select using (auth.role() = 'authenticated');
create policy "externos: catalogo" on external_projects for select using (true);

-- ------------------------------------------------------------
-- 11. BUSCA FACETADA (RPC chamada pela sidebar)
-- ------------------------------------------------------------
create or replace function search_assets(
  q text default null,
  p_kind text default null,
  p_category text default null,
  p_tags text[] default null,
  p_min_ms int default null,
  p_max_ms int default null,
  lim int default 60,
  off int default 0
) returns setof assets language sql stable as $$
  select a.* from assets a
  where (q is null or unaccent(a.name) ilike '%' || unaccent(q) || '%' or q = any(a.tags))
    and (p_kind is null or a.kind = p_kind)
    and (p_category is null or a.category like p_category || '%')
    and (p_tags is null or a.tags && p_tags)
    and (p_min_ms is null or a.duration_ms >= p_min_ms)
    and (p_max_ms is null or a.duration_ms <= p_max_ms)
  order by
    case when q is not null and unaccent(a.name) ilike unaccent(q) || '%' then 0 else 1 end,
    a.name
  limit lim offset off;
$$;

-- ------------------------------------------------------------
-- 12. CÓPIA DO PROJETO (duplicar / versionar)
-- ------------------------------------------------------------
create or replace function duplicate_project(p_id uuid, new_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  insert into projects (user_id, name, doc_version, doc, width, height, fps, duration_ms)
  select user_id,
         coalesce(new_name, name || ' (cópia)'),
         doc_version, doc, width, height, fps, duration_ms
  from projects
  where id = p_id and user_id = auth.uid()
  returning id into new_id;

  if new_id is null then
    raise exception 'Projeto não encontrado ou sem permissão';
  end if;
  return new_id;
end $$;

-- ------------------------------------------------------------
-- 13. LIMPEZA DE VERSÕES ANTIGAS (rodar por cron/Edge Function)
-- ------------------------------------------------------------
create or replace function prune_project_versions(keep int default 30)
returns void language sql security definer as $$
  delete from project_versions pv
  using (
    select id, row_number() over (partition by project_id order by created_at desc) as rn
    from project_versions
  ) ranked
  where pv.id = ranked.id and ranked.rn > keep;
$$;

-- ------------------------------------------------------------
-- 14. VIEW: prova que o banco está magro
-- ------------------------------------------------------------
create or replace view v_storage_weight as
select
  (select count(*) from assets)                                   as assets,
  pg_size_pretty((select coalesce(sum(bytes),0) from assets))      as midia_referenciada,
  pg_size_pretty(pg_total_relation_size('assets'))                as assets_no_banco,
  pg_size_pretty(pg_total_relation_size('projects'))              as projetos_no_banco,
  pg_size_pretty((select coalesce(sum(pg_column_size(doc)),0)::bigint from projects)) as docs_tamanho;
