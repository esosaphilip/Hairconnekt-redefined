import { InternalServerErrorException, Logger } from '@nestjs/common';
import { BrevoClient } from '@getbrevo/brevo';

const logger = new Logger('EmailProvider');
let brevoClient: BrevoClient | null = null;
let configuredApiKey: string | null = null;

type MailerConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
};

export type SendEmailParams = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
};

function getConfig(): MailerConfig | null {
  const apiKey = process.env.BREVO_API_KEY?.trim() ?? '';
  const fromEmail = (process.env.SMTP_FROM ?? process.env.EMAIL_FROM)?.trim() ?? '';
  const fromName = process.env.SMTP_FROM_NAME?.trim() ?? '';

  if (!apiKey || !fromEmail || !fromName) return null;

  return { apiKey, fromEmail, fromName };
}

function getBrevoClient(apiKey: string): BrevoClient {
  if (brevoClient && configuredApiKey === apiKey) return brevoClient;

  configuredApiKey = apiKey;
  brevoClient = new BrevoClient({
    apiKey,
    timeoutInSeconds: 30,
    maxRetries: 2,
  });

  return brevoClient;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const config = getConfig();
  if (!config) {
    logger.warn('Transactional email skipped because Brevo email config is incomplete.');
    return;
  }

  const fromEmail = (params.from ?? config.fromEmail).trim();
  if (!fromEmail) return;

  try {
    await getBrevoClient(config.apiKey).transactionalEmails.sendTransacEmail({
      sender: {
        email: fromEmail,
        name: config.fromName,
      },
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.html,
      textContent: params.text,
    });
  } catch (error) {
    logger.error(
      'Brevo transactional email send failed',
      error instanceof Error ? error.stack ?? error.message : String(error),
    );
    throw new InternalServerErrorException('E-Mail konnte nicht gesendet werden.');
  }
}
