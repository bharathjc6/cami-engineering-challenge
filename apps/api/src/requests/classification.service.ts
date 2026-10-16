import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CLASSIFICATION_PROVIDER,
  ClassificationCategory,
  ClassificationProvider,
  ClassificationResult,
} from './classification-provider';
import { ClassificationRecord } from './classification-record.entity';
import { RequestsService } from './requests.service';
import { DEFAULT_HISTORY_LIMIT } from './dto/history-query.dto';

export type ClassifyResponse = ClassificationResult & {
  requestId: string | null;
};

export type HistoryFilter = {
  category?: ClassificationCategory;
  requestId?: string;
  limit?: number;
};

export type HistoryItem = {
  id: string;
  requestId: string | null;
  message: string;
  category: ClassificationCategory;
  confidence: number;
  provider: string;
  createdAt: string;
};

const SHORT_MESSAGE_WORDS = 3;
const SHORT_MESSAGE_PENALTY = 0.15;
const SHORT_MESSAGE_FLOOR = 0.5;
const UNKNOWN_THRESHOLD = 0.55;

/**
 * Business rules applied on top of the raw classifier output, independent of
 * which provider produced it.
 */
export function applyConfidenceRules(
  message: string,
  raw: ClassificationResult,
): ClassificationResult {
  let result = raw;

  // Soften confidence for very short messages.
  if (message.split(/\s+/).length < SHORT_MESSAGE_WORDS && result.category !== 'unknown') {
    result = {
      category: result.category,
      confidence: Math.max(SHORT_MESSAGE_FLOOR, result.confidence - SHORT_MESSAGE_PENALTY),
    };
  }

  // Prefer "unknown" when confidence is weak.
  if (result.confidence < UNKNOWN_THRESHOLD) {
    result = { category: 'unknown', confidence: result.confidence };
  }

  return result;
}

export function toHistoryItem(record: ClassificationRecord): HistoryItem {
  return {
    id: record.id,
    requestId: record.requestId,
    message: record.message,
    category: record.category,
    confidence: record.confidence,
    provider: record.provider,
    createdAt: record.createdAt.toISOString(),
  };
}

@Injectable()
export class ClassificationService {
  constructor(
    @Inject(CLASSIFICATION_PROVIDER)
    private readonly provider: ClassificationProvider,
    private readonly requestsService: RequestsService,
    @InjectRepository(ClassificationRecord)
    private readonly history: Repository<ClassificationRecord>,
  ) {}

  /** `message` is expected to be trimmed and length-checked by the DTO. */
  async classify(message: string, requestId?: string): Promise<ClassifyResponse> {
    const result = applyConfidenceRules(message, await this.provider.classify(message));

    // Apply first: it 404s on an unknown request before anything is recorded.
    if (requestId) {
      await this.requestsService.applyClassification(requestId, result);
    }

    await this.history.save(
      this.history.create({
        requestId: requestId ?? null,
        message,
        category: result.category,
        confidence: result.confidence,
        provider: this.provider.name,
      }),
    );

    return {
      category: result.category,
      confidence: result.confidence,
      requestId: requestId ?? null,
    };
  }

  async listHistory(filter: HistoryFilter = {}): Promise<HistoryItem[]> {
    const records = await this.history.find({
      where: {
        ...(filter.category ? { category: filter.category } : {}),
        ...(filter.requestId ? { requestId: filter.requestId } : {}),
      },
      order: { createdAt: 'DESC' },
      take: filter.limit ?? DEFAULT_HISTORY_LIMIT,
    });
    return records.map(toHistoryItem);
  }
}
