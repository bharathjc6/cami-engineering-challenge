import { describe, expect, it, vi } from 'vitest';
import {
  applyConfidenceRules,
  ClassificationService,
} from '../src/requests/classification.service';
import { KeywordClassifier } from '../src/requests/keyword-classifier';
import { RequestsService } from '../src/requests/requests.service';

describe('applyConfidenceRules', () => {
  it('keeps confident results for normal-length messages', () => {
    const result = applyConfidenceRules('my invoice is wrong', {
      category: 'billing',
      confidence: 0.86,
    });
    expect(result).toEqual({ category: 'billing', confidence: 0.86 });
  });

  it('softens confidence for messages under three words', () => {
    const result = applyConfidenceRules('invoice', { category: 'billing', confidence: 0.86 });
    expect(result.category).toBe('billing');
    expect(result.confidence).toBeCloseTo(0.71);
  });

  it('falls back to unknown when softened confidence drops below the threshold', () => {
    const result = applyConfidenceRules('help', { category: 'support', confidence: 0.6 });
    expect(result).toEqual({ category: 'unknown', confidence: 0.5 });
  });
});

describe('ClassificationService', () => {
  function setup() {
    const requestsService = {
      applyClassification: vi.fn().mockResolvedValue(undefined),
    } as unknown as RequestsService;
    const service = new ClassificationService(new KeywordClassifier(), requestsService);
    return { service, requestsService };
  }

  it('classifies without touching a request when no requestId is given', async () => {
    const { service, requestsService } = setup();
    const response = await service.classify('Our billing invoice looks wrong');

    expect(response).toEqual({ category: 'billing', confidence: 0.86, requestId: null });
    expect(requestsService.applyClassification).not.toHaveBeenCalled();
  });

  it('applies the adjusted result to the request when a requestId is given', async () => {
    const { service, requestsService } = setup();
    const id = '6f1c2b2e-0000-4000-8000-000000000001';
    const response = await service.classify('Our billing invoice looks wrong', id);

    expect(response.requestId).toBe(id);
    expect(requestsService.applyClassification).toHaveBeenCalledWith(id, {
      category: 'billing',
      confidence: 0.86,
    });
  });
});
