const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const CryptoJS = require('crypto-js');

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Reading credentials from DB...');
  const passSetting = await prisma.systemSetting.findUnique({
    where: { key: 'smtp_pass' },
  });

  const encKeySetting = await prisma.systemSetting.findUnique({
    where: { key: 'encryption_key' },
  });

  const encKey = encKeySetting?.value || 'thermal-track-crypto-key-9988';
  
  if (passSetting && passSetting.value) {
    console.log('Encrypted Pass in DB:', passSetting.value);
    try {
      const bytes = CryptoJS.AES.decrypt(passSetting.value, encKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      console.log('Decrypted Pass:', decrypted);
      console.log('Length:', decrypted.length);
    } catch (e) {
      console.error('Decryption failed:', e);
    }
  } else {
    console.log('No smtp_pass found in DB');
  }

  const userSetting = await prisma.systemSetting.findUnique({
    where: { key: 'smtp_user' },
  });
  console.log('SMTP User in DB:', userSetting?.value);
}

main();
