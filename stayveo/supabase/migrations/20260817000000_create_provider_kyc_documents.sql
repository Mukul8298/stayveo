-- Private storage for Tiffin provider identity documents.
-- The application uploads through a Fastify signed-upload endpoint because
-- provider OTP sessions are not Supabase Auth sessions.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'provider-kyc-documents',
  'provider-kyc-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Tiffin providers can read own KYC documents" on storage.objects;
drop policy if exists "Tiffin providers can upload own KYC documents" on storage.objects;
drop policy if exists "Tiffin providers can update own KYC documents" on storage.objects;
drop policy if exists "Tiffin providers can delete own KYC documents" on storage.objects;

-- These policies cover users who also have a Supabase Auth session. The
-- custom StayVeo OTP flow is authorized by the backend signed-upload route;
-- its server-only service role does not need a public or anon policy.
create policy "Tiffin providers can read own KYC documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'provider-kyc-documents'
  and exists (
    select 1
    from public.provider_profiles provider
    where provider.id::text = (storage.foldername(name))[1]
      and provider.user_id = (select auth.uid())
  )
);

create policy "Tiffin providers can upload own KYC documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-kyc-documents'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'pdf')
  and exists (
    select 1
    from public.provider_profiles provider
    where provider.id::text = (storage.foldername(name))[1]
      and provider.user_id = (select auth.uid())
  )
);

create policy "Tiffin providers can update own KYC documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'provider-kyc-documents'
  and exists (
    select 1
    from public.provider_profiles provider
    where provider.id::text = (storage.foldername(name))[1]
      and provider.user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'provider-kyc-documents'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'pdf')
);

create policy "Tiffin providers can delete own KYC documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'provider-kyc-documents'
  and exists (
    select 1
    from public.provider_profiles provider
    where provider.id::text = (storage.foldername(name))[1]
      and provider.user_id = (select auth.uid())
  )
);
