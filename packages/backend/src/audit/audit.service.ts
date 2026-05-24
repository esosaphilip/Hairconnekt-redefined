import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export type AuditRecordInput = {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  outcome?: 'success' | 'failure';
  reason?: string | null;
  request?: Request;
  metadata?: Record<string, unknown> | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async record(input: AuditRecordInput): Promise<void> {
    const entry = this.auditLogRepo.create({
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      outcome: input.outcome ?? 'success',
      reason: input.reason ?? null,
      requestPath: this.getRequestPath(input.request),
      requestMethod: input.request?.method ?? null,
      ipAddress: this.getRequestIp(input.request),
      userAgent: input.request?.header('user-agent') ?? null,
      metadata: input.metadata ?? null,
      beforeState: input.beforeState ?? null,
      afterState: input.afterState ?? null,
    });

    try {
      await this.auditLogRepo.save(entry);
    } catch (error) {
      this.logger.error(
        `Failed to persist audit event ${input.action}`,
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  private getRequestPath(request?: Request): string | null {
    if (!request) {
      return null;
    }

    return (request.originalUrl ?? request.url ?? '').toString() || null;
  }

  private getRequestIp(request?: Request): string | null {
    if (!request) {
      return null;
    }

    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim() !== '') {
      return forwarded.split(',')[0]?.trim() ?? null;
    }

    return request.ip ?? null;
  }
}
