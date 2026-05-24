# StayVeo Supabase Storage Image Upload Architecture

This document explains the PG/hostel image upload flow used in provider onboarding.

## Bucket Setup

Create one Supabase Storage bucket:

- Bucket name: `pg-images`
- Public access: enabled for the current implementation
- Recommended file limit: `5 MB`
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

Why public now: PG listing photos are marketplace assets that students should be able to see without an authenticated download request. Public buckets let the frontend store stable CDN-backed URLs in PostgreSQL and render images directly in listing cards.

Security tradeoff: public means anyone with the URL can view the file. Do not use this bucket for identity documents, contracts, payment receipts, or private student/provider media. Those should use a private bucket with signed URLs.

Supabase SQL policy for authenticated uploads:

```sql
create policy "Providers can upload PG images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'pg-images');

create policy "Anyone can read PG images"
on storage.objects
for select
to public
using (bucket_id = 'pg-images');

create policy "Providers can delete PG images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'pg-images');
```

If onboarding is still using anonymous Supabase clients without Supabase Auth sessions, replace `to authenticated` with a more suitable backend-mediated upload flow. The production direction should be either:

- sign providers into Supabase Auth before upload, or
- have Fastify create signed upload URLs with a server-side service role key.

Never expose the service role key in Vite.

For local testing only, if provider onboarding still uses dummy OTP and no Supabase Auth session exists, an `anon` insert/delete policy will make direct browser uploads work. Do not ship unrestricted anonymous uploads to production because anyone with the anon key can upload files to the bucket.

## Runtime Flow

1. The provider selects or drops image files.
2. React validates MIME type, size, max count, and duplicates.
3. React creates `URL.createObjectURL(file)` so the preview appears instantly.
4. React uploads the real `File` object to Supabase Storage.
5. Supabase returns a storage object path.
6. The frontend calls `getPublicUrl(path)` to create the public CDN URL.
7. React stores the URL in the photo object as `uploadedUrl`.
8. On service detail submit, the frontend sends `photos: uploadedPhotos.map(photo => photo.uploadedUrl)`.
9. Fastify validates `photos` as an array of URLs.
10. Prisma stores the URLs in `PGDetails.photos String[]`.

## React State Shape

Each photo is stored as a full lifecycle object:

```js
{
  id,
  file,
  previewUrl,
  uploadedUrl,
  storagePath,
  uploading,
  error,
  metadata
}
```

Why this shape matters:

- `file` is the browser `File` used for upload and retry.
- `previewUrl` gives instant UI feedback before network upload completes.
- `uploadedUrl` is the only value sent to the backend.
- `storagePath` lets the app remove orphaned Storage objects when a user removes a photo.
- `uploading` powers loading states and prevents premature form submission.
- `error` lets one failed image be retried without losing the whole form.
- `metadata` supports duplicate detection and accessible display names.

## Storage Path Design

Files are uploaded under:

```text
pg-images/
  provider-<provider-id>/
    pg-<draft-or-listing-id>/
      <timestamp>-<image-id>.jpg
```

Folder-like paths matter even though object storage is flat internally. They make cleanup, debugging, policy design, lifecycle rules, and future migrations much easier. They also keep CDN paths stable and human-readable.

## Database Design

PostgreSQL stores URLs, not image binaries.

Reasons:

- binary files make database rows large and slow to query
- CDN delivery belongs in object storage, not Postgres
- image lifecycle operations are easier in Storage
- Prisma `String[]` maps cleanly to Postgres text arrays for `photos`

The database record only needs to know where the file can be served from.

## Future TODOs

- Add upload progress bars when using a transport that exposes upload progress.
- Compress large images before upload to reduce mobile data usage.
- Generate resized thumbnails for listing cards.
- Convert uploads to WebP where browser support and quality allow.
- Move sensitive media to private buckets with signed URLs.
- Add signed upload URLs from Fastify for stricter provider ownership checks.
- Add retry with exponential backoff.
- Add object lifecycle cleanup for abandoned onboarding drafts.
- Configure CDN cache and image transformation rules for production traffic.
