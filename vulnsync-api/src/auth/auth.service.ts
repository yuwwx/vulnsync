// auth.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LogsService } from '@/logs/logs.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private logsService: LogsService,
  ) {}

  async login(user: any, req: any) {
    const payload = { sub: user.id, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
      username: user.username,
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
}
