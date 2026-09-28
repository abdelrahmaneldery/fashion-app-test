// A Supabase-shaped Postgres in-process (PGlite + pgvector): the auth and storage schemas,
// the anon/authenticated/service_role roles and Supabase's default grants, so migrations and
// row-level security run exactly as they will on the hosted project.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema extensions;
  create schema auth;
  create schema storage;
  grant usage on schema public, extensions, storage to anon, authenticated, service_role;
  grant usage on schema auth to anon, authenticated, service_role;

  create table auth.users (
    instance_id uuid, id uuid primary key, aud text, role text, email text unique,
    encrypted_password text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now(), updated_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create table storage.buckets (id text primary key, name text not null, public boolean default false);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
    name text not null, owner uuid default nullif(current_setting('request.jwt.claim.sub', true), '')::uuid);
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
  grant all on storage.objects to anon, authenticated, service_role;
  grant select on storage.buckets to anon, authenticated, service_role;

  -- Supabase's default privileges: RLS, not grants, is what protects public tables.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

export async function createDatabase({ seed = true } = {}) {
  const db = new PGlite({ extensions: { vector } });
  await db.exec(SUPABASE_SHIM);
  const dir = join(ROOT, 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(readFileSync(join(dir, file), 'utf8'));
    } catch (e) {
      throw new Error(`migration ${file} failed: ${e.message}`);
    }
  }
  if (seed) await db.exec(readFileSync(join(ROOT, 'seed.sql'), 'utf8'));
  return db;
}

/** Run SQL as a given caller: null = anonymous, a uuid = that signed-in user, 'service' = the pipeline. */
export async function as(db, who, sql, params = []) {
  const role = who === null ? 'anon' : who === 'service' ? 'service_role' : 'authenticated';
  const sub = who === null || who === 'service' ? '' : who;
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [sub]);
  await db.exec(`set role ${role}`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

export async function createUser(db, email, meta = {}) {
  const rows = (await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), $1, $2) returning id`,
    [email, JSON.stringify(meta)])).rows;
  return rows[0].id;
}
