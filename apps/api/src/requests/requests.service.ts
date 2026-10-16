import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerRequest, RequestStatus } from './customer-request.entity';
import { ClassificationResult } from './classification-provider';
import { ListOptions, RequestListItem } from './requests.types';
import { REQUESTS_REPOSITORY, RequestsRepository } from './persistence/requests.repository';

export type { ListOptions, RequestListItem } from './requests.types';

@Injectable()
export class RequestsService {
  constructor(
    @Inject(REQUESTS_REPOSITORY)
    private readonly requests: RequestsRepository,
  ) {}

  list(options: ListOptions = {}): Promise<RequestListItem[]> {
    return this.requests.listWithNoteSummary(options);
  }

  async getById(id: string): Promise<CustomerRequest> {
    const row = await this.requests.findById(id);
    if (!row) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    return row;
  }

  async updateStatus(id: string, status: RequestStatus): Promise<CustomerRequest> {
    const row = await this.getById(id);
    row.status = status;
    return this.requests.save(row);
  }

  create(message: string): Promise<CustomerRequest> {
    return this.requests.create({
      message,
      status: 'open',
      category: null,
      confidence: null,
    });
  }

  /** Records a classification on the request and moves it out of "open". */
  async applyClassification(
    id: string,
    result: ClassificationResult,
  ): Promise<CustomerRequest> {
    const row = await this.getById(id);
    row.category = result.category;
    row.confidence = result.confidence;
    if (row.status === 'open') {
      row.status = 'in_progress';
    }
    return this.requests.save(row);
  }
}
