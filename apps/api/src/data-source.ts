import { DataSource } from 'typeorm';
import { CustomerRequest } from './requests/customer-request.entity';
import { RequestNote } from './requests/request-note.entity';
import { ClassificationRecord } from './requests/classification-record.entity';
import { InitialSchema1710000000000 } from './migrations/1710000000000-InitialSchema';
import { ListIndexes1720000000000 } from './migrations/1720000000000-ListIndexes';
import { ClassificationHistory1730000000000 } from './migrations/1730000000000-ClassificationHistory';

export function createDataSource() {
  return new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgres://cami:cami@localhost:5432/cami',
    entities: [CustomerRequest, RequestNote, ClassificationRecord],
    migrations: [
      InitialSchema1710000000000,
      ListIndexes1720000000000,
      ClassificationHistory1730000000000,
    ],
    synchronize: false,
    logging: false,
  });
}
