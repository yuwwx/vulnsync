// Тестовая отправка письма через SMTP из .env.dev/.env.
// Интерактивно спросит отправителя и получателя (или примет их аргументами).
//
//   npm run test:mail
//   npm run test:mail -- --from=report@example.com --to=user@example.com
//   node scripts/test-send-mail.mjs --env=.env
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const flags = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=?(.*)$/.exec(arg);
    if (match) {
      flags[match[1]] = match[2] || true;
    }
  }
  return flags;
}

const flags = parseArgs(process.argv.slice(2));

const envFile = path.resolve(
  rootDir,
  String(flags.env ?? "").trim() || ".env.dev",
);
const fallbackEnvFile = path.resolve(rootDir, ".env");

for (const file of [envFile, fallbackEnvFile]) {
  if (!fs.existsSync(file)) {
    continue;
  }
  dotenv.config({ path: file, quiet: true });
  console.log(`Загружены переменные из ${path.relative(rootDir, file)}`);
}

const host = (process.env.SMTP_HOST ?? "").trim();
const port = Number(process.env.SMTP_PORT ?? 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

if (!host) {
  console.error("SMTP_HOST не задан. Проверьте .env.dev или укажите --env=<файл>.");
  process.exit(1);
}

console.log(`SMTP: ${host}:${port}${user ? ` (user: ${user})` : ""}`);

const interactive = process.stdin.isTTY === true;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function close() {
  rl.close();
}

process.on("SIGINT", () => {
  close();
  process.exit(130);
});

async function ask(label, defaultValue) {
  if (!interactive) {
    return defaultValue ?? "";
  }
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = (await rl.question(`${label}${suffix}: `)).trim();
  return answer || defaultValue || "";
}

try {
  const from = String(
    flags.from ?? (await ask("Отправитель (From)", process.env.DD_REPORT_MAIL_FROM?.trim())),
  ).trim();
  const to = String(flags.to ?? (await ask("Получатель (To)"))).trim();
  const subject = String(
    flags.subject ?? (await ask("Тема", "Проверка SMTP VulnSync")),
  ).trim();

  if (!from) {
    throw new Error("Не указан отправитель (--from=... или интерактивный ввод)");
  }
  if (!to) {
    throw new Error("Не указан получатель (--to=... или интерактивный ввод)");
  }

  close();

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
    tls: { rejectUnauthorized: false },
  });

  console.log(`Отправка письма: ${from} -> ${to} ...`);

  const info = await transport.sendMail({
    from,
    to,
    subject,
    html: `<p>Тестовое письмо VulnSync.</p>
<p>Отправлено: ${new Date().toISOString()}</p>
<p>SMTP: ${host}:${port}</p>`,
  });

  console.log(`Письмо отправлено. Message ID: ${info.messageId}`);
  const accepted = (info.accepted ?? []).map((address) => String(address));
  const rejected = (info.rejected ?? []).map((address) => String(address));
  if (accepted.length) {
    console.log(`Принято сервером: ${accepted.join(", ")}`);
  }
  if (rejected.length) {
    console.warn(`Отклонено сервером: ${rejected.join(", ")}`);
    process.exitCode = 1;
  }
} catch (error) {
  close();
  console.error(`Ошибка отправки: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
