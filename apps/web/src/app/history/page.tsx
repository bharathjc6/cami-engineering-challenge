'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CLASSIFICATION_CATEGORIES, ClassificationCategory, fetchHistory } from '@/lib/api';

export default function HistoryPage() {
  const [category, setCategory] = useState<ClassificationCategory | ''>('');
  const historyQuery = useQuery({
    queryKey: ['history', category],
    queryFn: () => fetchHistory(category || undefined),
  });

  const items = historyQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Classification history</h2>
        <p className="mt-1 text-sm text-slate-600">
          Every classification run, newest first, with the provider that produced it.
        </p>
      </div>

      <label className="flex max-w-sm flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Filter by category</span>
        <select
          className="rounded border border-slate-300 bg-white px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value as ClassificationCategory | '')}
        >
          <option value="">All categories</option>
          {CLASSIFICATION_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      {historyQuery.isLoading ? (
        <p className="text-slate-600">Loading…</p>
      ) : historyQuery.isError ? (
        <p className="text-red-700">Failed to load history.</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No classifications yet{category ? ` for "${category}"` : ''}. Use Classify on the
          Requests page to add some.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Provider</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <div className="font-medium text-slate-900">{item.message}</div>
                    {item.requestId ? null : (
                      <div className="mt-1 text-xs text-slate-500">Not linked to a request</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3 text-slate-600">{item.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
