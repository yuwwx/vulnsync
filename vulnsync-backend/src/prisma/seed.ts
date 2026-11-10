import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Role } from '../../prisma/generated/enums';
import { PrismaService } from './prisma.service';

const config = new ConfigService({
  DATABASE_URL: process.env.DATABASE_URL,
});

const prisma = new PrismaService(config);

// Тестовые аккаунты для dev — по одному на каждую роль.
// Логин/пароль переопределяются через SEED_ADMIN_*, SEED_USER_*, SEED_VIEWER_*.
const accounts = [
  {
    username: process.env.SEED_ADMIN_USERNAME ?? 'admin',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'admin',
    role: 'ADMIN' as Role,
  },
  {
    username: process.env.SEED_USER_USERNAME ?? 'user',
    password: process.env.SEED_USER_PASSWORD ?? 'user',
    role: 'USER' as Role,
  },
  {
    username: process.env.SEED_VIEWER_USERNAME ?? 'viewer',
    password: process.env.SEED_VIEWER_PASSWORD ?? 'viewer',
    role: 'VIEWER' as Role,
  },
];

async function main() {
  // Сид только для dev: на проде (NODE_ENV=production) ничего не делаем
  if (process.env.NODE_ENV === 'production') {
    console.log('Seed skipped: NODE_ENV=production');
    return;
  }

  for (const account of accounts) {
    const hashed = await bcrypt.hash(account.password, 10);

    const user = await prisma.user.upsert({
      where: { username: account.username },
      update: { password: hashed, role: account.role },
      create: {
        username: account.username,
        password: hashed,
        role: account.role,
      },
    });

    console.log('User upserted:', {
      username: user.username,
      role: user.role,
    });
  }
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
