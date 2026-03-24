drop policy if exists "Admins can upload product images" on storage.objects;

create policy "Authenticated users can upload own product images"
on storage.objects
as permissive
for insert
to authenticated
with check (
  bucket_id = 'product_images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can update own product images"
on storage.objects
as permissive
for update
to authenticated
using (
  bucket_id = 'product_images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'product_images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can delete own product images"
on storage.objects
as permissive
for delete
to authenticated
using (
  bucket_id = 'product_images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Admins can upload catalog product images"
on storage.objects
as permissive
for insert
to authenticated
with check (
  bucket_id = 'product_images'
  and (storage.foldername(name))[1] = 'products'
  and exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
);
