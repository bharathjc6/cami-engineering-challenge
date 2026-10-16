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

@Module({
  imports: [TypeOrmModule.forFeature([CustomerRequest, RequestNote, ClassificationRecord])],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    ClassificationService,
    // Swap useClass for another ClassificationProvider (e.g. an LLM-backed one).
    { provide: CLASSIFICATION_PROVIDER, useClass: KeywordClassifier },
  ],
})
export class RequestsModule {}
