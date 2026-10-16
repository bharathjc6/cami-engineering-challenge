import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerRequest } from './customer-request.entity';
import { RequestNote } from './request-note.entity';
import { ClassificationRecord } from './classification-record.entity';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { KeywordClassifier } from './keyword-classifier';
import { ClassificationService } from './classification.service';
import { CLASSIFICATION_PROVIDER } from './classification-provider';
import { REQUESTS_REPOSITORY } from './persistence/requests.repository';
import { TypeOrmRequestsRepository } from './persistence/typeorm-requests.repository';
import { CLASSIFICATION_HISTORY_REPOSITORY } from './persistence/classification-history.repository';
import { TypeOrmClassificationHistoryRepository } from './persistence/typeorm-classification-history.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerRequest, RequestNote, ClassificationRecord])],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    ClassificationService,
    // Swap useClass for another ClassificationProvider (e.g. an LLM-backed one).
    { provide: CLASSIFICATION_PROVIDER, useClass: KeywordClassifier },
    // Persistence adapters: services only see the repository interfaces.
    { provide: REQUESTS_REPOSITORY, useClass: TypeOrmRequestsRepository },
    {
      provide: CLASSIFICATION_HISTORY_REPOSITORY,
      useClass: TypeOrmClassificationHistoryRepository,
    },
  ],
})
export class RequestsModule {}
