import { createTiffinKycUploadUrl } from '../api/tiffinProvider';
import { supabase } from './supabase';

// This bucket must be private. The UI stores only the bucket/path reference;
// it never turns KYC documents into public URLs.
export const TIFFIN_KYC_BUCKET = 'provider-kyc-documents';
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
const ACCEPTED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const DOCUMENT_TYPES = new Set(['aadhaarFront', 'aadhaarBack', 'pan']);

export async function uploadTiffinKycDocument({ file, provider, documentType }) {
  if (!file) throw new Error('Select a document first');
  if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) throw new Error('Upload a JPEG, PNG, or PDF document');
  if (file.size > MAX_DOCUMENT_SIZE) throw new Error('Documents must be smaller than 5 MB');
  if (!provider?.providerId) throw new Error('Provider identity is required before uploading documents');
  if (!DOCUMENT_TYPES.has(documentType)) throw new Error('Unknown KYC document type');

  const response = await createTiffinKycUploadUrl(provider, {
    documentType,
    contentType: file.type,
  });
  const upload = response?.data;
  if (!upload?.path || !upload?.token) throw new Error('A secure KYC upload session could not be created');

  const { data, error } = await supabase.storage.from(TIFFIN_KYC_BUCKET).uploadToSignedUrl(upload.path, upload.token, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message || 'KYC document upload failed');
  return { storagePath: data?.path || upload.path, fileName: file.name };
}
