import { ClassificationCategory } from '../classification-provider';
import { ClassificationRecord } from '../classification-record.entity';

export type NewClassificationRecord = Pick<
  ClassificationRecord,
  'requestId' | 'message' | 'category' | 'confidence' | 'provider'
>;

export type HistoryFilter = {
  category?: ClassificationCategory;
  requestId?: string;
  limit: number;
  offset: number;
};

/** Persistence port for classification history. */
export interface ClassificationHistoryRepository {
  record(entry: NewClassificationRecord): Promise<ClassificationRecord>;
  /** Newest first. */
  find(filter: HistoryFilter): Promise<ClassificationRecord[]>;
}

export const CLASSIFICATION_HISTORY_REPOSITORY = Symbol('CLASSIFICATION_HISTORY_REPOSITORY');
