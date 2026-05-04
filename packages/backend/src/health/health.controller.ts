import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('health/db')
  async healthDb() {
    try {
      await this.dataSource.query('SELECT 1');
      return { ok: true };
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
