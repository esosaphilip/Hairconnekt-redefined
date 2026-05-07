import { Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

let sendgridInitialized = false;

type ErrorReport = {
  status: number;
  method: string;
  path: string;
  requestId?: string;
  message: string;
  stack?: string;
  userId?: string;
};

export class ErrorReporter {
  private readonly logger = new Logger(ErrorReporter.name);
  private windowStartMs = 0;
  private sentInWindow = 0;

  private isEnabled(): boolean {
    const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
    const apiKey = process.env.SENDGRID_API_KEY?.trim();
    const from = process.env.SENDGRID_FROM_EMAIL?.trim();
    return isProd && Boolean(apiKey) && Boolean(from);
  }

  private initSendgrid(): void {
    if (sendgridInitialized) return;
    const apiKey = process.env.SENDGRID_API_KEY?.trim();
    if (!apiKey) return;
    sgMail.setApiKey(apiKey);
    sendgridInitialized = true;
  }

  private canSendNow(): boolean {
    const windowMs = 10 * 60 * 1000;
    const maxPerWindow = 10;
    const now = Date.now();
    if (this.windowStartMs === 0 || now - this.windowStartMs > windowMs) {
      this.windowStartMs = now;
      this.sentInWindow = 0;
    }
    if (this.sentInWindow >= maxPerWindow) return false;
    this.sentInWindow += 1;
    return true;
  }

  async report(report: ErrorReport): Promise<void> {
    if (!this.isEnabled()) return;
    if (!this.canSendNow()) return;

    const from = process.env.SENDGRID_FROM_EMAIL?.trim();
    if (!from) return;

    try {
      this.initSendgrid();

      const lines = [
        `Time: ${new Date().toISOString()}`,
        `Status: ${report.status}`,
        `Method: ${report.method}`,
        `Path: ${report.path}`,
        `RequestId: ${report.requestId ?? ''}`,
        `UserId: ${report.userId ?? ''}`,
        `Message: ${report.message}`,
        '',
        report.stack ?? '',
      ];

      await sgMail.send({
        to: from,
        from,
        subject: `HairConnekt API error ${report.status} (${report.requestId ?? 'no-request-id'})`,
        text: lines.join('\n'),
      });
    } catch (err) {
      this.logger.error('Error reporting failed', err as any);
    }
  }
}

