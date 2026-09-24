import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ENCRYPTION_VERSION = 'v1';

function encryptionKey() {
  const configuredSecret = process.env.BANK_DETAILS_ENCRYPTION_KEY?.trim() || process.env.SESSION_SECRET?.trim();
  if (!configuredSecret) {
    const error = new Error('Bank details encryption is not configured');
    Object.assign(error, { statusCode: 503 });
    throw error;
  }
  return createHash('sha256').update(configuredSecret).digest();
}

/** Encrypt a sensitive value for storage. The key is never returned to callers. */
export function encryptSensitiveValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ENCRYPTION_VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':');
}

/** Decrypt a value written by encryptSensitiveValue. */
export function decryptSensitiveValue(value: string) {
  const [version, ivValue, tagValue, ciphertextValue] = value.split(':');
  if (version !== ENCRYPTION_VERSION || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error('Stored sensitive value has an invalid format');
  }

  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function maskBankAccountNumber(accountNumber: string) {
  const normalized = accountNumber.replace(/\D/g, '');
  const suffix = normalized.slice(-4);
  return suffix ? `XXXX XXXX ${suffix}` : 'XXXX XXXX';
}
