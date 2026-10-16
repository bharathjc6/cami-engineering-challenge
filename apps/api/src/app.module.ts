import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsModule } from './requests/requests.module';
import { CustomerRequest } from './requests/customer-request.entity';
import { RequestNote } from './requests/request-note.entity';
import { ClassificationRecord } from './requests/classification-record.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL ?? 'postgres://cami:cami@localhost:5432/cami',
      entities: [CustomerRequest, RequestNote, ClassificationRecord],
      synchronize: false,
      // Query logging prints every statement and its parameters (customer
      // message text) and is costly on hot paths; opt in with DB_LOGGING=query.
      logging: process.env.DB_LOGGING === 'query' ? ['query', 'error'] : ['error'],
    }),
    RequestsModule,
  ],
})
export class AppModule {}
