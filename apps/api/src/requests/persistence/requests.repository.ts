import { CustomerRequest } from '../customer-request.entity';
import { ListOptions, RequestListItem } from '../requests.types';

export type NewRequest = Pick<CustomerRequest, 'message' | 'status' | 'category' | 'confidence'>;

/** Persistence port for customer requests; services depend on this, not on TypeORM. */
export interface RequestsRepository {
  /** Newest first, with note count and latest note body aggregated per request. */
  listWithNoteSummary(options: ListOptions): Promise<RequestListItem[]>;
  findById(id: string): Promise<CustomerRequest | null>;
  create(data: NewRequest): Promise<CustomerRequest>;
  save(request: CustomerRequest): Promise<CustomerRequest>;
}

export const REQUESTS_REPOSITORY = Symbol('REQUESTS_REPOSITORY');
