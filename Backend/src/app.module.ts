import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { IndexController } from './api/index.controller';
import { DailyFetchJob } from './cron/daily-fetch.job';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { DataFetcherModule } from './modules/data-fetcher/data-fetcher.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { ComputationModule } from './modules/computation/computation.module';
import { StorageModule } from './modules/storatge/storage.module';
import { ProjectsController } from './api/project.controller';
import { ProjectsService } from './projects/project.service';
import { ProjectsModule } from './modules/projects/project.module';
import { ListingController } from './api/listing.controller';
import { ListingModule } from './modules/scraper/scraper.module';
import { PdfController } from './api/pdf.controller';
import { PDFModule } from './modules/pdf/pdf.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: 'redis',
      port: 6379,
    }),
    DataFetcherModule,
    BlockchainModule,
    ComputationModule,
    StorageModule,
    ProjectsModule,
    ListingModule,
    PDFModule
  ],
  controllers: [IndexController, ProjectsController, ListingController, PdfController],
  providers: [DailyFetchJob],
})
export class AppModule {}