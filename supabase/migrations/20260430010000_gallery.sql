create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-photos',
  'wedding-photos',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.gallery_uploaders (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 2 and 80),
  name_key text not null unique check (char_length(name_key) between 2 and 80),
  uploader_slug text not null check (char_length(uploader_slug) between 2 and 96),
  pin_salt text not null,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photo_uploads (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references public.gallery_uploaders(id) on delete cascade,
  uploader_name text not null,
  event_album text not null check (event_album in (
    'Mayra',
    'Mehendi',
    'South Indian Carnival',
    'Sangeet',
    'Milni & Phera',
    'Reception'
  )),
  file_path text not null unique,
  file_name text not null,
  content_type text not null check (content_type like 'image/%'),
  file_size integer not null check (file_size > 0 and file_size <= 10485760),
  uploaded_at timestamptz not null default now()
);

alter table public.photo_uploads
  add column if not exists uploader_id uuid references public.gallery_uploaders(id) on delete cascade,
  add column if not exists uploader_name text,
  add column if not exists event_album text,
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists content_type text default 'image/jpeg',
  add column if not exists file_size integer default 1,
  add column if not exists uploaded_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'photo_uploads'
      and column_name = 'uploader_token'
  ) then
    alter table public.photo_uploads alter column uploader_token drop not null;
  end if;
end $$;

create index if not exists photo_uploads_album_uploaded_idx
  on public.photo_uploads (event_album, uploaded_at desc);

create index if not exists photo_uploads_uploader_uploaded_idx
  on public.photo_uploads (uploader_id, uploaded_at desc);

create unique index if not exists photo_uploads_file_path_unique_idx
  on public.photo_uploads (file_path)
  where file_path is not null;

create or replace function public.set_gallery_uploaders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_gallery_uploaders_updated_at on public.gallery_uploaders;
create trigger set_gallery_uploaders_updated_at
before update on public.gallery_uploaders
for each row execute function public.set_gallery_uploaders_updated_at();

alter table public.gallery_uploaders enable row level security;
alter table public.photo_uploads enable row level security;

drop policy if exists "Public can view gallery photos" on public.photo_uploads;
create policy "Public can view gallery photos"
on public.photo_uploads
for select
using (true);

drop policy if exists "Public can view wedding photos" on storage.objects;
create policy "Public can view wedding photos"
on storage.objects
for select
using (bucket_id = 'wedding-photos');
