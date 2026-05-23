import * as nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

type MailerConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export type SendEmailParams = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
};

function getConfig(): MailerConfig | null {
  const host = process.env.SMTP_HOST?.trim() ?? '';
  const portRaw = process.env.SMTP_PORT?.trim() ?? '';
  const port = portRaw ? parseInt(portRaw, 10) : NaN;
  const user = process.env.SMTP_USER?.trim() ?? '';
  const pass = process.env.SMTP_PASS?.trim() ?? '';
  const from = (process.env.EMAIL_FROM ?? process.env.SENDGRID_FROM_EMAIL)?.trim() ?? '';

  if (!host || !Number.isFinite(port) || !user || !pass || !from) return null;

  return { host, port, user, pass, from };
}

function getTransporter(config: MailerConfig): nodemailer.Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    requireTLS: config.port !== 465,
  });

  return transporter;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const config = getConfig();
  if (!config) return;

  const transport = getTransporter(config);
  const from = (params.from ?? config.from).trim();
  if (!from) return;

  await transport.sendMail({
    to: params.to,
    from,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}

