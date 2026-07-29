// auth.service.ts
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

type AuthenticatedUser = {
  id: string;
  username: string;
  role: string;
  email?: string | null;
  displayName?: string | null;
  jobTitle?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(user: AuthenticatedUser) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      username: user.username,
      email: user?.email,
      displayName: user?.displayName,
      jobTitle: user?.jobTitle,
      role: user.role,
    };
  }

  async validateLocalUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.password) return null;

    const match = await bcrypt.compare(password, user.password);

    if (!match) return null;

    return user;
  }

  async validateLdapUser(
    username: string,
    ldapDn: string,
    email: string,
    displayName: string,
    jobTitle: string,
    role: string = 'USER',
  ) {
    const user = await this.prisma.user.upsert({
      where: { username },
      update: {
        ldapDn,
        email,
        displayName,
        jobTitle,
        role,
        updatedAt: new Date(),
      },
      create: {
        username,
        ldapDn,
        email,
        displayName,
        jobTitle,
        role,
      },
    });

    return user;
  }
}
