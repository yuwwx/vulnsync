// auth.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async validateLocalUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.password) return null;

    const match = await bcrypt.compare(password, user.password);

    if (!match) return null;

    return user;
  }

  async validateLdapUser(username: string, ldapDn: string) {
    let user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          username,
          ldapDn,
        },
      });
    }

    return user;
  }

  async login(user: any) {
    return {
      id: user.id,
      username: user.username,
    };
  }
}
