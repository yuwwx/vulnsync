import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';

const config = new ConfigService({
  DATABASE_URL: process.env.DATABASE_URL,
});

const prisma = new PrismaService(config);

async function main() {
  const password = await bcrypt.hash('changeme', 10);

  const user = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      password,
    },
  });

  console.log('Test user created:', user);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
