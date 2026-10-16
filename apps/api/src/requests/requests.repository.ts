import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerRequest, RequestStatus } from './customer-request.entity';

export type RequestListItem = {
  id: string;
  message: string;
  status: RequestStatus;
  category: string | null;
  confidence: number | null;
  noteCount: number;
  latestNotePreview: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListOptions = {
  limit?: number;
  offset?: number;
};

export type NewRequest = Pick<CustomerRequest, 'message' | 'status' | 'category' | 'confidence'>;

/** Raw row shape returned by the list query (snake_case, as Postgres returns it). */
export type RequestListRow = {
  id: string;
  message: string;
  status: RequestStatus;
  category: string | null;
  confidence: number | null;
  created_at: Date;
  updated_at: Date;
  note_count: number;
  latest_note_body: string | null;
};

export function toRequestListItem(row: RequestListRow): RequestListItem {
  return {
    id: row.id,
    message: row.message,
    status: row.status,
    category: row.category,
    confidence: row.confidence,
    noteCount: Number(row.note_count),
    latestNotePreview: row.latest_note_body ?? null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** All data access for customer requests; RequestsService holds only business rules. */
@Injectable()
export class RequestsRepository {
  constructor(
    @InjectRepository(CustomerRequest)
    private readonly requests: Repository<CustomerRequest>,
  ) {}

  /**
   * One round trip regardless of row count: note count and latest note body are
   * aggregated per request in SQL instead of loading every note into memory.
   */
  async listWithNoteSummary(options: ListOptions): Promise<RequestListItem[]> {
    const params: number[] = [];
    let paging = '';
    if (options.limit !== undefined) {
      params.push(options.limit, options.offset ?? 0);
      paging = 'LIMIT $1 OFFSET $2';
    }

    const rows: RequestListRow[] = await this.requests.query(
      `SELECT r.id, r.message, r.status, r.category, r.confidence,
              r.created_at, r.updated_at,
              COALESCE(nc.note_count, 0) AS note_count,
              ln.body AS latest_note_body
         FROM customer_requests r
         LEFT JOIN LATERAL (
           SELECT count(*)::int AS note_count
             FROM request_notes n
            WHERE n.request_id = r.id
         ) nc ON true
         LEFT JOIN LATERAL (
           SELECT n.body
             FROM request_notes n
            WHERE n.request_id = r.id
            ORDER BY n.created_at DESC, n.id DESC
            LIMIT 1
         ) ln ON true
        ORDER BY r.created_at DESC, r.id DESC
        ${paging}`,
      params,
    );

    return rows.map(toRequestListItem);
  }

  findById(id: string): Promise<CustomerRequest | null> {
    return this.requests.findOne({ where: { id }, relations: { notes: true } });
  }

  create(data: NewRequest): Promise<CustomerRequest> {
    return this.requests.save(this.requests.create(data));
  }

  save(request: CustomerRequest): Promise<CustomerRequest> {
    return this.requests.save(request);
  }
}
