import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassificationRecord } from '../classification-record.entity';
import {
  ClassificationHistoryRepository,
  HistoryFilter,
  NewClassificationRecord,
} from './classification-history.repository';

@Injectable()
export class TypeOrmClassificationHistoryRepository implements ClassificationHistoryRepository {
  constructor(
    @InjectRepository(ClassificationRecord)
    private readonly history: Repository<ClassificationRecord>,
  ) {}

  record(entry: NewClassificationRecord): Promise<ClassificationRecord> {
    return this.history.save(this.history.create(entry));
  }

  find(filter: HistoryFilter): Promise<ClassificationRecord[]> {
    return this.history.find({
      where: {
        ...(filter.category ? { category: filter.category } : {}),
        ...(filter.requestId ? { requestId: filter.requestId } : {}),
      },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: filter.limit,
      skip: filter.offset,
    });
  }
}
