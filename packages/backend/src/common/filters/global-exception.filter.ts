import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorReporter } from '../error-reporting/error-reporter';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly errorReporter?: ErrorReporter) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.header('x-request-id') ?? ((request as any).requestId as string | undefined);
    const userId = (request as any)?.user?.sub as string | undefined;

    let status: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' && 'message' in (res as object)
        ? (res as any).message
        : exception.message;
      if (status === 400) {
        this.logger.warn(`Validation Error 400: ${JSON.stringify(res)}`);
      } else if (status >= 500) {
        this.logger.error(
          `HttpException ${status} ${request.method} ${request.url} requestId=${requestId ?? ''}`,
          exception instanceof Error ? exception.stack : String(exception),
        );
        void this.errorReporter?.report({
          status,
          method: request.method,
          path: request.url,
          requestId: requestId ?? undefined,
          userId,
          message: exception.message,
          stack: exception instanceof Error ? exception.stack : String(exception),
        });
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Interner Serverfehler.';
      // NEVER expose raw exception details to client
      this.logger.error(
        `Unhandled exception 500 ${request.method} ${request.url} requestId=${requestId ?? ''}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      void this.errorReporter?.report({
        status,
        method: request.method,
        path: request.url,
        requestId: requestId ?? undefined,
        userId,
        message: exception instanceof Error ? exception.message : 'Unhandled exception',
        stack: exception instanceof Error ? exception.stack : String(exception),
      });
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    });
  }
}
