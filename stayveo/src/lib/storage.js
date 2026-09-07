import { supabase } from './supabase';

export const SERVICE_IMAGES_BUCKET = 'pg-images';



export const STORAGE_SERVICE_TYPES = {
  PG: 'pg',
  TIFFIN: 'tiffin',
};

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE_BYTES = 7 * 1024 * 1024;
export const MAX_SERVICE_IMAGES = 5;

const EXTENSION_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function sanitizePathPart(value, fallback = 'unknown') {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

export function normalizeStorageServiceType(serviceType = STORAGE_SERVICE_TYPES.PG) {
  const normalized = sanitizePathPart(serviceType, STORAGE_SERVICE_TYPES.PG);
  if (normalized === 'hostel' || normalized === 'room' || normalized === 'rooms') {
    return STORAGE_SERVICE_TYPES.PG;
  }
  return Object.values(STORAGE_SERVICE_TYPES).includes(normalized)
    ? normalized
    : STORAGE_SERVICE_TYPES.PG;
}

export function validateImageFile(file) {
  if (!file) throw new Error('No image file selected');
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are supported');
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image must be smaller than 7 MB');
  }
}

export function createStoragePath({
  providerId,
  listingId = 'draft',
  serviceType = STORAGE_SERVICE_TYPES.PG,
  imageId,
  file,
}) {
  const normalizedType = normalizeStorageServiceType(serviceType);
  const extension = EXTENSION_BY_TYPE[file.type] || file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const providerFolder = `provider-${sanitizePathPart(providerId)}`;
  const listingFolder = sanitizePathPart(listingId, 'draft');
  const uniqueName = `${Date.now()}-${sanitizePathPart(imageId)}.${extension}`;

  return `${providerFolder}/${normalizedType}/${listingFolder}/${uniqueName}`;
}

function classifyStorageError(error, bucket) {
  const message = error?.message || 'Image upload failed';
  const lower = message.toLowerCase();

  if (lower.includes('bucket not found')) {
    return new Error(
      `Supabase Storage bucket "${bucket}" was not found. Create this exact bucket in the connected Supabase project.`
    );
  }

  if (lower.includes('row-level security') || lower.includes('violates row-level security') || error?.statusCode === '403') {
    return new Error(
      `Supabase Storage policy blocked upload to "${bucket}". Check INSERT policy on storage.objects for this bucket.`
    );
  }

  if (lower.includes('mime') || lower.includes('content type')) {
    return new Error('Image MIME type is not allowed by the bucket configuration.');
  }

  return new Error(message);
}

export async function uploadImage({
  file,
  providerId,
  listingId,
  serviceType = STORAGE_SERVICE_TYPES.PG,
  imageId,
  bucket = SERVICE_IMAGES_BUCKET,
}) {
  validateImageFile(file);

  if (!providerId) {
    throw new Error('Provider ID is required before uploading images');
  }

  const normalizedType = normalizeStorageServiceType(serviceType);
  const path = createStoragePath({
    providerId,
    listingId,
    serviceType: normalizedType,
    imageId: imageId || crypto.randomUUID?.() || `${Date.now()}`,
    file,
  });

  // Compression hook belongs here in production, before upload().
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
      metadata: {
        originalName: file.name,
        serviceType: normalizedType,
      },
    });

  if (error) {
    throw classifyStorageError(error, bucket);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  if (!publicUrlData?.publicUrl) {
    throw new Error(`Uploaded image URL could not be generated for bucket "${bucket}"`);
  }

  return {
    bucket,
    path: data.path,
    storagePath: `${bucket}/${data.path}`,
    publicUrl: publicUrlData.publicUrl,
    serviceType: normalizedType,
  };
}

export async function removeImageFromStorage(pathOrStoragePath, bucket = SERVICE_IMAGES_BUCKET) {
  if (!pathOrStoragePath) return;

  const { bucket: resolvedBucket, path } = parseStoragePath(pathOrStoragePath, bucket);
  if (!path) return;

  const { error } = await supabase.storage
    .from(resolvedBucket)
    .remove([path]);

  if (error) {
    throw classifyStorageError(error, resolvedBucket);
  }
}

export function parseStoragePath(pathOrStoragePath, fallbackBucket = SERVICE_IMAGES_BUCKET) {
  const raw = String(pathOrStoragePath || '').trim();
  if (!raw) return { bucket: fallbackBucket, path: '' };

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const marker = '/storage/v1/object/public/';
    const markerIndex = raw.indexOf(marker);
    if (markerIndex >= 0) {
      const storagePath = raw.slice(markerIndex + marker.length);
      const [urlBucket, ...rest] = storagePath.split('/');
      return { bucket: urlBucket || fallbackBucket, path: rest.join('/') };
    }
    return { bucket: fallbackBucket, path: '' };
  }

  const [first, ...rest] = raw.split('/');
  if (first === SERVICE_IMAGES_BUCKET || first === 'pg-images') {
    return { bucket: 'pg-images', path: rest.join('/') };
  }

  return { bucket: fallbackBucket, path: raw };
}
