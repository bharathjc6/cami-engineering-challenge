import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from '../src/requests/requests.service';
import { CustomerRequest } from '../src/requests/customer-request.entity';
import { RequestsRepository } from '../src/requests/requests.repository';

function makeRequest(overrides: Partial<CustomerRequest> = {}): CustomerRequest {
  return Object.assign(new CustomerRequest(), {
    id: '6f1c2b2e-0000-4000-8000-000000000001',
    message: 'Refund did not arrive',
    status: 'open',
    category: null,
    confidence: null,
    notes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function setup(existing: CustomerRequest | null = makeRequest()) {
  const repo = {
    listWithNoteSummary: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(existing),
    create: vi.fn(async (data: Partial<CustomerRequest>) => makeRequest(data)),
    save: vi.fn(async (request: CustomerRequest) => request),
  };
  return { service: new RequestsService(repo as unknown as RequestsRepository), repo };
}

describe('RequestsService', () => {
  it('delegates paging to the repository', async () => {
    const { service, repo } = setup();
    await service.list({ limit: 26, offset: 25 });
    expect(repo.listWithNoteSummary).toHaveBeenCalledWith({ limit: 26, offset: 25 });
  });

  it('throws NotFound for an unknown id', async () => {
    const { service } = setup(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates new requests as open and unclassified', async () => {
    const { service, repo } = setup();
    await service.create('Need a demo');
    expect(repo.create).toHaveBeenCalledWith({
      message: 'Need a demo',
      status: 'open',
      category: null,
      confidence: null,
    });
  });

  it('moves an open request to in_progress when classified', async () => {
    const { service, repo } = setup();
    const saved = await service.applyClassification('id', {
      category: 'billing',
      confidence: 0.86,
    });
    expect(saved).toMatchObject({ status: 'in_progress', category: 'billing', confidence: 0.86 });
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it('keeps a resolved request resolved when classified', async () => {
    const { service } = setup(makeRequest({ status: 'resolved' }));
    const saved = await service.applyClassification('id', { category: 'sales', confidence: 0.8 });
    expect(saved.status).toBe('resolved');
  });
});
