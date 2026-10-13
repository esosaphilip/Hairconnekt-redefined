import { Controller, Get, Logger, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  detectPlatform,
  resolveAppStoreTarget,
  sanitizeSrc,
} from './app-store-target';

@Controller('app')
export class AppRedirectController {
  private readonly logger = new Logger(AppRedirectController.name);

  @Get()
  redirect(
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    const userAgent = req.headers['user-agent'];
    const srcRaw = (req.query as Record<string, unknown>).src;
    const platform = detectPlatform(userAgent);
    const target = resolveAppStoreTarget(userAgent);
    const src = sanitizeSrc(srcRaw);

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'User-Agent');

    this.logger.log(`app-redirect platform=${platform} src=${src ?? 'none'}`);

    res.redirect(302, target);
  }
}
