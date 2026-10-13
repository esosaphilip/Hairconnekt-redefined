import { Module } from '@nestjs/common';
import { AppRedirectController } from './app-redirect.controller';

@Module({
  controllers: [AppRedirectController],
})
export class AppRedirectModule {}
