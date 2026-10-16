import { describe, expect, it, vi } from 'vitest';
import {
  applyConfidenceRules,
  ClassificationService,
} from '../src/requests/classification.service';
import { ClassificationProvider } from '../src/requests/classification-provider';
import { Repository } from 'typeorm';
import { ClassificationRecord } from '../src/requests/classification-record.entity';
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
  const requestId = '6f1c2b2e-0000-4000-8000-000000000001';

  function setup() {
    const provider: ClassificationProvider = {
      name: 'fake-v1',
      classify: vi.fn().mockResolvedValue({ category: 'sales', confidence: 0.9 }),
    };
    const requestsService = {
      applyClassification: vi.fn().mockResolvedValue(undefined),
    } as unknown as RequestsService;
    const saved: Partial<ClassificationRecord>[] = [];
    const history = {
      create: (data: Partial<ClassificationRecord>) => data,
      save: vi.fn(async (data: Partial<ClassificationRecord>) => {
        saved.push(data);
        return data;
      }),
      find: vi.fn().mockResolvedValue([]),
    } as unknown as Repository<ClassificationRecord>;

    const service = new ClassificationService(provider, requestsService, history);
    return { service, provider, requestsService, history, saved };
  }

  it('classifies and records history without touching a request', async () => {
    const { service, requestsService, saved } = setup();
    const response = await service.classify('Can we book a demo soon');

    expect(response).toEqual({ category: 'sales', confidence: 0.9, requestId: null });
    expect(requestsService.applyClassification).not.toHaveBeenCalled();
    expect(saved).toEqual([
      {
        requestId: null,
        message: 'Can we book a demo soon',
        category: 'sales',
        confidence: 0.9,
        provider: 'fake-v1',
      },
    ]);
  });

  it('applies the adjusted result to the request and records it', async () => {
    const { service, requestsService, saved } = setup();
    const response = await service.classify('demo', requestId);

    // Single word: confidence softened by the rules, not the provider.
    expect(response).toEqual({ category: 'sales', confidence: 0.75, requestId });
    expect(requestsService.applyClassification).toHaveBeenCalledWith(requestId, {
      category: 'sales',
      confidence: 0.75,
    });
    expect(saved[0]).toMatchObject({ requestId, category: 'sales', provider: 'fake-v1' });
  });

  it('records nothing when the request does not exist', async () => {
    const { service, requestsService, history } = setup();
    vi.mocked(requestsService.applyClassification).mockRejectedValue(new Error('not found'));

    await expect(service.classify('Can we book a demo soon', requestId)).rejects.toThrow();
    expect(history.save).not.toHaveBeenCalled();
  });

  it('passes filters and paging defaults to the repository', async () => {
    const { service, history } = setup();
    await service.listHistory({ category: 'billing' });
    expect(history.find).toHaveBeenCalledWith({
      where: { category: 'billing' },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: 50,
      skip: 0,
    });
  });
});
