import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dgram from 'node:dgram';
import * as net from 'node:net';
import * as os from 'node:os';
import { LogEvent } from './logs.service';

type SyslogProtocol = 'udp' | 'tcp';

// RFC 5424: facility 13 (log audit), severity 6 (info) / 4 (warning).
const FACILITY_LOG_AUDIT = 13;
const SEVERITY_INFO = 6;
const SEVERITY_WARNING = 4;
const SD_ID = 'vulnsync@32473';

@Injectable()
export class SyslogService implements OnModuleDestroy {
  private readonly logger = new Logger(SyslogService.name);
  private readonly host?: string;
  private readonly port: number;
  private readonly protocol: SyslogProtocol;
  private readonly appName = 'vulnsync';
  private readonly hostname = os.hostname();
  private udpSocket?: dgram.Socket;

  constructor(private config: ConfigService) {
    this.host = config.get<string>('SYSLOG_HOST');
    this.port = Number(config.get<string>('SYSLOG_PORT') ?? 514);
    this.protocol =
      (config.get<string>('SYSLOG_PROTOCOL') ?? 'udp').toLowerCase() === 'tcp'
        ? 'tcp'
        : 'udp';

    if (!this.host) {
      return;
    }

    if (this.protocol === 'udp') {
      this.udpSocket = dgram.createSocket('udp4');
      this.udpSocket.on('error', (error) => {
        this.logger.warn(`Syslog UDP error: ${error.message}`);
      });
    }

    this.logger.log(
      `Syslog forwarding enabled: ${this.protocol}://${this.host}:${this.port}`,
    );
  }

  // Отправка не блокирует журналирование и не влияет на ответ запроса.
  send(event: LogEvent) {
    if (!this.host) {
      return;
    }

    const line = this.format(event);

    if (this.protocol === 'udp') {
      this.udpSocket?.send(Buffer.from(line), this.port, this.host, (error) => {
        if (error) {
          this.logger.warn(`Failed to send syslog message: ${error.message}`);
        }
      });
      return;
    }

    const socket = net.connect({ host: this.host, port: this.port }, () => {
      socket.write(`${line}\n`);
      socket.end();
    });

    socket.setTimeout(3000, () => socket.destroy());
    socket.on('error', (error) => {
      this.logger.warn(`Failed to send syslog message: ${error.message}`);
    });
  }

  onModuleDestroy() {
    this.udpSocket?.close();
  }

  private format(event: LogEvent): string {
    const result = this.resultOf(event);
    const severity = result === 'FAIL' ? SEVERITY_WARNING : SEVERITY_INFO;
    const priority = FACILITY_LOG_AUDIT * 8 + severity;
    const timestamp = new Date().toISOString();

    const sd = [
      `${SD_ID}`,
      `action="${this.escape(event.action)}"`,
      `service="${this.escape(event.service ?? '')}"`,
      `username="${this.escape(event.username ?? '')}"`,
      `userId="${this.escape(event.userId ?? '')}"`,
      `src="${this.escape(event.ip ?? '')}"`,
      `dst="${this.escape(event.destinationIp ?? '')}"`,
      `result="${this.escape(result ?? '')}"`,
    ].join(' ');

    const message = JSON.stringify({
      action: event.action,
      description: event.description ?? null,
      userId: event.userId ?? null,
      username: event.username ?? null,
      sourceIp: event.ip ?? null,
      destinationIp: event.destinationIp ?? null,
      result: result ?? null,
      meta: event.meta ?? null,
    });

    return `<${priority}>1 ${timestamp} ${this.hostname} ${this.appName} - - [${sd}] ${message}`;
  }

  private resultOf(event: LogEvent): string | undefined {
    if (
      event.meta &&
      typeof event.meta === 'object' &&
      !Array.isArray(event.meta)
    ) {
      const result = (event.meta as Record<string, unknown>).result;

      return typeof result === 'string' ? result : undefined;
    }

    return undefined;
  }

  // RFC 5424 structured data: экранируем кавычки, обратный слэш и ']'.
  private escape(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\]/g, '\\]')
      .replace(/[\r\n]/g, ' ');
  }
}
