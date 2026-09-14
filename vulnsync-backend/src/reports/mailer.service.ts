// src/reports/mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private config: ConfigService) {}

  private createTransport() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host?.trim()) {
      throw new Error('SMTP_HOST is not configured');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
  }

  async send(params: { to: string; subject: string; html: string }) {
    const from = this.config.get<string>('DD_REPORT_MAIL_FROM');

    if (!from?.trim()) {
      throw new Error('DD_REPORT_MAIL_FROM is not configured');
    }

    this.logger.log(`Sending email to ${params.to}...`);

    await this.createTransport().sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    this.logger.log('Email sent');
  }
}
