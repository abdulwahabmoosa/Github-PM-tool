import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const KEY_HEX = process.env.TOKEN_ENCRYPTION_KEY ?? '';
if (KEY_HEX.length !== 64) {
  throw new Error(
    `TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Got ${KEY_HEX.length} chars.`
  );
}
const KEY = Buffer.from(KEY_HEX, 'hex');

export function encrypt(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(packed) {
  const parts = packed.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted token format');
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
