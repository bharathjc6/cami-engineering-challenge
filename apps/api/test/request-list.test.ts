import { describe, expect, it } from 'vitest';
import { toRequestListItem } from '../src/requests/persistence/typeorm-requests.repository';

describe('toRequestListItem', () => {
  const base = {
    id: '6f1c2b2e-0000-4000-8000-000000000001',
    message: 'Refund did not arrive',
    status: 'open' as const,
    category: null,
    confidence: null,
    created_at: new Date('2024-01-01T10:00:00.000Z'),
    updated_at: new Date('2024-01-02T10:00:00.000Z'),
  };

  it('maps aggregated note fields to the list item shape', () => {
    const item = toRequestListItem({
      ...base,
      note_count: 3,
      latest_note_body: 'Followed up by email.',
    });

    expect(item).toEqual({
      id: base.id,
      message: base.message,
      status: 'open',
      category: null,
      confidence: null,
      noteCount: 3,
      latestNotePreview: 'Followed up by email.',
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-02T10:00:00.000Z',
    });
  });

  it('handles requests without notes', () => {
    const item = toRequestListItem({ ...base, note_count: 0, latest_note_body: null });
    expect(item.noteCount).toBe(0);
    expect(item.latestNotePreview).toBeNull();
  });
});
