import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Role } from '../../prisma/generated/enums';
import { PrismaService } from './prisma.service';

const config = new ConfigService({
  DATABASE_URL: process.env.DATABASE_URL,
});

const prisma = new PrismaService(config);

// Параметры тестового пользователя можно переопределить:
// SEED_USERNAME, SEED_PASSWORD, SEED_ROLE (USER | ADMIN | VIEWER)
const username = process.env.SEED_USERNAME ?? 'testuser';
const password = process.env.SEED_PASSWORD ?? 'changeme';
const role = (process.env.SEED_ROLE ?? 'USER') as Role;

async function main() {
  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: { password: hashed, role },
    create: {
      username,
      password: hashed,
      role,
    },
  });

  console.log('Test user upserted:', {
    username: user.username,
    role: user.role,
  });
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
