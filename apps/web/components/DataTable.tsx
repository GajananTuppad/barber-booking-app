'use client';

import { useMemo, useState, type ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchValue?: (row: T) => string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  searchPlaceholder,
  searchValue,
  emptyMessage = 'No results.',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    if (!query || !searchValue) return rows;
    const lower = query.toLowerCase();
    return rows.filter((row) => searchValue(row).toLowerCase().includes(lower));
  }, [rows, query, searchValue]);

  const sorted = useMemo(() => {
    const column = sortKey ? columns.find((c) => c.key === sortKey) : undefined;
    if (!column?.sortValue) return filtered;
    const getSortValue = column.sortValue;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = getSortValue(a);
      const bv = getSortValue(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  function handleSort(column: DataTableColumn<T>) {
    if (!column.sortValue) return;
    if (sortKey === column.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(column.key);
      setSortDir('asc');
    }
  }

  return (
    <div>
      {searchValue ? (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder ?? 'Search…'}
          className="mb-4 w-full max-w-sm rounded-card border border-border bg-input px-3 py-2 text-sm text-white outline-none focus:border-gold"
        />
      ) : null}

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-card">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column)}
                  className={`px-4 py-3 font-medium text-muted ${column.sortValue ? 'cursor-pointer select-none' : ''} ${column.className ?? ''}`}
                >
                  {column.header}
                  {sortKey === column.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={rowKey(row)} className="border-t border-border">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 text-white ${column.className ?? ''}`}>
                      {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
