# Supabase setup (external configuration)

Everything required in the Supabase project for ACE.AI auth to work. The app code
assumes this is in place; none of it is created by the application at runtime. Run
the SQL in the **SQL Editor**, and apply the dashboard settings as described.

> The app reads only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> for Milestone 2. The service-role key is **not** used yet (it arrives with the
> admin client in a later milestone).

---

## 1. Project + environment

1. Create a Supabase project; note the **Project URL** and **anon public** key
   (Project Settings → API).
2. In the app, copy `.env.example` → `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```
   `.env.local` is gitignored; `.env.example` is the committed template.

---

## 2. Auth providers & URLs

### Email/password + confirmation
- **Authentication → Providers → Email**: enable **Email**, and turn **Confirm email ON**
  (the app's flow assumes confirmation is required).
- **Authentication → URL Configuration**:
  - **Site URL**: `http://localhost:3000` (use the production URL in prod).
  - **Redirect URLs** (allow-list): add
    - `http://localhost:3000/auth/callback`
    - `http://localhost:3000/auth/confirm`
    - the production equivalents.

### Email templates (point links at the route handlers)
The app verifies one-time tokens at `/auth/confirm`. Update the templates
(**Authentication → Email Templates**) so the action link uses `token_hash` + `type`:

- **Confirm signup**:
  ```
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard">Confirm your email</a>
  ```
- **Reset password**:
  ```
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset password</a>
  ```

> The app also passes `emailRedirectTo` / `redirectTo` when calling Supabase, but the
> template link is what the user actually clicks — keep both consistent.

### Google OAuth
1. In **Google Cloud Console** → APIs & Services → Credentials → create an **OAuth 2.0
   Client ID** (type: Web application).
   - **Authorized redirect URI**: `https://<project-ref>.supabase.co/auth/v1/callback`
     (this is Supabase's callback, not the app's).
2. In **Supabase → Authentication → Providers → Google**: enable it and paste the
   **Client ID** and **Client secret**.
3. Ensure `http://localhost:3000/auth/callback` (and prod) are in the Redirect URLs
   allow-list (step 2 above) — that's where Supabase sends the user back to the app.

---

## 3. Schema

```sql
-- profiles: one row per auth user (created by trigger, see §4)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  role        text default 'fullstack',
  created_at  timestamptz default now()
);

-- interviews: created in a later phase; included for completeness
create table if not exists public.interviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  role           text,
  question_type  text,            -- 'behavioral' | 'technical'
  config         jsonb,
  result         jsonb,
  transcript     jsonb,
  created_at     timestamptz default now(),
  started_at     timestamptz,
  completed_at   timestamptz,
  duration_ms    bigint,
  question_count int,
  success        boolean,
  error          text
);
```

---

## 4. Profile creation trigger

Profiles are created by a database trigger on `auth.users` insert — **not** by the
app (no client-side or Server Action write). This is atomic and survives any signup
path (email or OAuth).

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## 5. Row Level Security (primary authorization model)

RLS is the authorization model: the request-scoped server client reads under the
user's session, so policies must allow each user to see only their own rows.

```sql
alter table public.profiles enable row level security;
alter table public.interviews enable row level security;

-- profiles: a user can read/update only their own profile
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- interviews: full CRUD scoped to the owner
create policy "interviews_select_own" on public.interviews
  for select using (auth.uid() = user_id);
create policy "interviews_insert_own" on public.interviews
  for insert with check (auth.uid() = user_id);
create policy "interviews_update_own" on public.interviews
  for update using (auth.uid() = user_id);
create policy "interviews_delete_own" on public.interviews
  for delete using (auth.uid() = user_id);
```

> Inserts into `profiles` happen inside the `security definer` trigger, which runs
> with elevated rights, so no insert policy is needed there.

---

## 6. Recreate-from-scratch checklist

- [ ] Project created; URL + anon key in `.env.local`.
- [ ] Email provider enabled; **Confirm email** ON.
- [ ] Site URL + Redirect URLs allow-list configured (`/auth/callback`, `/auth/confirm`).
- [ ] Email templates point at `/auth/confirm` with `token_hash`, `type`, `next`.
- [ ] Google OAuth client created; client id/secret in Supabase; Supabase callback URI set.
- [ ] `profiles` + `interviews` tables created.
- [ ] `handle_new_user` function + `on_auth_user_created` trigger installed.
- [ ] RLS enabled and policies created on `profiles` and `interviews`.
