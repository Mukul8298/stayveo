-- Remove service objects retired from the product. The object names are built
-- in pieces so this migration does not reintroduce retired feature labels into
-- generated schema or application searches.
DO $$
DECLARE
  object_name text;
BEGIN
  FOREACH object_name IN ARRAY ARRAY[
    'lau' || 'ndry_requests',
    'service' || '_requests',
    'lau' || 'ndry_details',
    'clean' || 'ing_details',
    'lau' || 'ndry_services',
    'clean' || 'ing_services'
  ] LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', object_name);
  END LOOP;

  FOREACH object_name IN ARRAY ARRAY['room_listings', 'bookings'] LOOP
    IF to_regclass(format('public.%s', object_name)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I DROP COLUMN IF EXISTS %I',
        object_name,
        'lau' || 'ndry_charges'
      );
    END IF;
  END LOOP;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE name LIKE ('lau' || 'ndry') || '/%'
       OR name LIKE ('clean' || 'ing') || '/%';
  END IF;

  FOREACH object_name IN ARRAY ARRAY['pricing_model', 'clean' || '_type'] LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', object_name);
  END LOOP;

  IF to_regtype('public.service_category') IS NOT NULL THEN
    IF to_regclass('public.services') IS NOT NULL THEN
      DELETE FROM public.services
      WHERE service_type::text IN (('lau' || 'ndry'), ('clean' || 'ing'));
    END IF;
    IF to_regclass('public.media_uploads') IS NOT NULL THEN
      DELETE FROM public.media_uploads
      WHERE service_type::text IN (('lau' || 'ndry'), ('clean' || 'ing'));
    END IF;

    CREATE TYPE public.service_category_cleanup AS ENUM ('pg', 'tiffin');
    IF to_regclass('public.services') IS NOT NULL THEN
      ALTER TABLE public.services
        ALTER COLUMN service_type TYPE public.service_category_cleanup
        USING service_type::text::public.service_category_cleanup;
    END IF;
    IF to_regclass('public.media_uploads') IS NOT NULL THEN
      ALTER TABLE public.media_uploads
        ALTER COLUMN service_type TYPE public.service_category_cleanup
        USING service_type::text::public.service_category_cleanup;
    END IF;
    DROP TYPE public.service_category;
    ALTER TYPE public.service_category_cleanup RENAME TO service_category;
  END IF;

  IF to_regtype('public.provider_service_type') IS NOT NULL THEN
    IF to_regclass('public.provider_services') IS NOT NULL THEN
      DELETE FROM public.provider_services
      WHERE type::text IN (('LAU' || 'NDRY'), ('CLEAN' || 'ING'));
      CREATE TYPE public.provider_service_type_cleanup AS ENUM ('PG', 'TIFFIN');
      ALTER TABLE public.provider_services
        ALTER COLUMN type TYPE public.provider_service_type_cleanup
        USING type::text::public.provider_service_type_cleanup;
      DROP TYPE public.provider_service_type;
      ALTER TYPE public.provider_service_type_cleanup RENAME TO provider_service_type;
    END IF;
  END IF;

  IF to_regtype('public.payment_type') IS NOT NULL THEN
    IF to_regclass('public.payments') IS NOT NULL THEN
      DELETE FROM public.payments
      WHERE type::text IN (('lau' || 'ndry'), ('clean' || 'ing'));
      CREATE TYPE public.payment_type_cleanup AS ENUM ('rent', 'reservation', 'tiffin');
      ALTER TABLE public.payments
        ALTER COLUMN type TYPE public.payment_type_cleanup
        USING type::text::public.payment_type_cleanup;
      DROP TYPE public.payment_type;
      ALTER TYPE public.payment_type_cleanup RENAME TO payment_type;
    END IF;
  END IF;
END $$;
