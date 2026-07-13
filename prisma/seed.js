const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcryptjs');

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create default Admin user
  const adminUsername = 'admin';
  const plainPassword = 'Admin123!';
  const hashedPassword = bcrypt.hashSync(plainPassword, 10);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      passwordHash: hashedPassword,
    },
  });
  console.log('Created Admin user:', admin.username);

  // Create default machines
  const defaultMachines = [
    { name: 'Makine-01', location: 'Bölüm A - Enjeksiyon' },
    { name: 'Makine-02', location: 'Bölüm B - Montaj' },
    { name: 'Makine-03', location: 'Bölüm C - Ambalaj' },
  ];

  for (const m of defaultMachines) {
    const machine = await prisma.machine.upsert({
      where: { name: m.name },
      update: { location: m.location },
      create: {
        name: m.name,
        location: m.location,
      },
    });

    // Create default thresholds for this machine
    await prisma.threshold.upsert({
      where: { machineId: machine.id },
      update: {},
      create: {
        machineId: machine.id,
        maxTemperature: 40.0,
        minTemperature: 15.0,
        maxHumidity: 80.0,
        minHumidity: 20.0,
      },
    });

    console.log(`Created/Updated Machine: ${machine.name} with default thresholds.`);
  }

  // Create default system settings
  const defaultSettings = [
    { key: 'smtp_host', value: 'smtp.gmail.com' },
    { key: 'smtp_port', value: '587' },
    { key: 'smtp_user', value: 'erenaoyunda@gmail.com' },
    { key: 'smtp_pass', value: '' },
    { key: 'smtp_secure', value: 'false' },
    { key: 'alert_email', value: 'erenaoyunda@gmail.com' },
    { key: 'encryption_key', value: 'thermal-track-crypto-key-9988' },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: {
        key: s.key,
        value: s.value,
      },
    });
  }
  console.log('Created system settings placeholders.');

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Note: in Prisma 7, the adapter connection is closed when the client is disconnected.
  });
