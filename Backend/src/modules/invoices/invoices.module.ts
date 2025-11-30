import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from '../../api/invoices.controller';
import { DbService } from '../../db/db.service';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, DbService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
