import { Injectable } from '@nestjs/common';
import { ClassificationResult, KeywordClassifier } from './keyword-classifier';
import { RequestsService } from './requests.service';

export type ClassifyResponse = ClassificationResult & {
  requestId: string | null;
};

const SHORT_MESSAGE_WORDS = 3;
const SHORT_MESSAGE_PENALTY = 0.15;
const SHORT_MESSAGE_FLOOR = 0.5;
const UNKNOWN_THRESHOLD = 0.55;

/**
 * Business rules applied on top of the raw classifier output, independent of
 * which classifier produced it.
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

@Injectable()
export class ClassificationService {
  constructor(
    private readonly classifier: KeywordClassifier,
    private readonly requestsService: RequestsService,
  ) {}

  /** `message` is expected to be trimmed and length-checked by the DTO. */
  async classify(message: string, requestId?: string): Promise<ClassifyResponse> {
    const result = applyConfidenceRules(message, this.classifier.classify(message));

    if (requestId) {
      await this.requestsService.applyClassification(requestId, result);
    }

    return {
      category: result.category,
      confidence: result.confidence,
      requestId: requestId ?? null,
    };
  }
}
