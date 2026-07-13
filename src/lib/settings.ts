import { prisma } from './db';
import CryptoJS from 'crypto-js';

// Fetch the encryption key from system settings or use default
async function getEncryptionKey(): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'encryption_key' },
  });
  return setting?.value || 'thermal-track-crypto-key-9988';
}

export async function getSetting(key: string): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key },
  });
  if (!setting) return '';

  // Decrypt if it is a password
  if (key === 'smtp_pass' && setting.value) {
    try {
      const encKey = await getEncryptionKey();
      const bytes = CryptoJS.AES.decrypt(setting.value, encKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.error('Decryption failed for smtp_pass:', e);
      return '';
    }
  }

  return setting.value;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  let valueToStore = value;

  // Encrypt if it is a password
  if (key === 'smtp_pass' && value) {
    const encKey = await getEncryptionKey();
    valueToStore = CryptoJS.AES.encrypt(value, encKey).toString();
  }

  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: valueToStore },
    create: { key, value: valueToStore },
  });
}

export async function getAllSettings() {
  const settings = await prisma.systemSetting.findMany();
  const config: Record<string, string> = {};
  
  for (const s of settings) {
    if (s.key === 'smtp_pass') {
      // Don't leak the real password to the client API response, return a placeholder if set
      config[s.key] = s.value ? '********' : '';
    } else {
      config[s.key] = s.value;
    }
  }

  return config;
}
