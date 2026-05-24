# StayVeo Supabase Storage Runbook

## Root Cause

`Bucket not found` means the frontend is connected to a Supabase project where the bucket passed to `.storage.from(bucket)` does not exist. StayVeo now uses the existing Supabase bucket everywhere:

- canonical bucket: `pg-images`

The frontend now uses `pg-images` as a fixed shared bucket constant.

## Recommended Bucket Architecture

Use one shared public-read service media bucket:

```txt
pg-images/
  provider-9876543210/
    pg/
      draft/
      room-listing-id/
    tiffin/
      draft/
      meal-plan-id/
    laundry/
      draft/
      laundry-offering-id/
    cleaning/
      draft/
      cleaning-offering-id/
```

Why one bucket:

- Lower maintenance: one bucket, one policy set, one env var.
- Better consistency: same upload component works everywhere.
- Same performance/cost profile as separate buckets.
- Easier migrations and CDN cache rules.
- Service separation still exists in object paths.

Use separate buckets only when services need different retention, privacy, legal, or MIME/size rules.

## Dashboard Setup

1. Open Supabase Dashboard.
2. Select the exact project used by `VITE_SUPABASE_URL`.
3. Go to `Storage`.
4. Create bucket:
   - Name: `pg-images`
   - Public bucket: enabled for current public listing images
   - File size limit: `7 MB` or higher
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
5. Restart the Vite dev server after changing `.env`.

## SQL Setup

Run this in Supabase SQL Editor.

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pg-images',
  'pg-images',
  true,
  7340032,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

Development policy, if provider auth is not fully wired yet:

```sql
drop policy if exists "StayVeo public read service images" on storage.objects;
drop policy if exists "StayVeo anon upload service images" on storage.objects;
drop policy if exists "StayVeo anon update service images" on storage.objects;
drop policy if exists "StayVeo anon delete service images" on storage.objects;

create policy "StayVeo public read service images"
on storage.objects
for select
to public
using (bucket_id = 'pg-images');

create policy "StayVeo anon upload service images"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'pg-images'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "StayVeo anon update service images"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'pg-images')
with check (bucket_id = 'pg-images');

create policy "StayVeo anon delete service images"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'pg-images');
```

Production policy after Supabase Auth is connected:

```sql
drop policy if exists "StayVeo anon upload service images" on storage.objects;
drop policy if exists "StayVeo anon update service images" on storage.objects;
drop policy if exists "StayVeo anon delete service images" on storage.objects;

create policy "StayVeo authenticated upload own service images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pg-images'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and (storage.foldername(name))[1] = 'provider-' || (select auth.uid()::text)
);

create policy "StayVeo authenticated update own service images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pg-images'
  and owner_id = (select auth.uid()::text)
)
with check (bucket_id = 'pg-images');

create policy "StayVeo authenticated delete own service images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pg-images'
  and owner_id = (select auth.uid()::text)
);
```

If provider folder names use phone numbers today, keep the development policy until auth IDs are the folder key.

## Debugging Checklist

1. Confirm `.env`:
   - `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<anon key from same project>`
2. Restart Vite after env changes.
3. Confirm Storage has the exact bucket name. Names are case-sensitive.
4. Confirm the bucket is in the same Supabase project as the URL.
5. Confirm MIME type is one of JPEG, PNG, WebP.
6. Confirm file size is under the bucket limit.
7. Confirm RLS policies are on `storage.objects`, not only `storage.buckets`.
8. Confirm upload path does not start with `/`.
9. Confirm frontend calls:
   - `supabase.storage.from('pg-images').upload(path, file)`
   - `supabase.storage.from('pg-images').getPublicUrl(path)`
10. Check browser console for the improved error message from `classifyStorageError`.

## Frontend Contract

`uploadImage()` returns:

```ts
{
  bucket: 'pg-images',
  path: 'provider-123/pg/draft/123-photo.webp',
  storagePath: 'pg-images/provider-123/pg/draft/123-photo.webp',
  publicUrl: 'https://.../storage/v1/object/public/pg-images/provider-123/pg/draft/123-photo.webp',
  serviceType: 'pg'
}
```

Store `publicUrl` in form image arrays for listing display. Store `storagePath` if you need reliable deletion later.
