import { useState, useMemo, useEffect } from 'react';

/**
 * Hook for debouncing a search string input
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

export interface UseSearchFilterOptions<T> {
  data: T[];
  searchFields: (keyof T | ((item: T) => string))[];
  initialFilters?: Record<string, any>;
  debounceMs?: number;
}

export function useSearchFilter<T>({
  data,
  searchFields,
  initialFilters = {},
  debounceMs = 300,
}: UseSearchFilterOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);

  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Text Search Matching
      if (debouncedSearchTerm.trim().length > 0) {
        const query = debouncedSearchTerm.trim().toLowerCase();
        const matchesSearch = searchFields.some((field) => {
          let val: string | undefined;
          if (typeof field === 'function') {
            val = field(item);
          } else {
            const raw = item[field];
            val = typeof raw === 'string' ? raw : raw !== null && raw !== undefined ? String(raw) : undefined;
          }
          return val ? val.toLowerCase().includes(query) : false;
        });

        if (!matchesSearch) return false;
      }

      // 2. Exact / Custom Field Filters
      for (const [key, filterVal] of Object.entries(filters)) {
        if (filterVal === undefined || filterVal === null || filterVal === 'all' || filterVal === '') {
          continue;
        }

        const itemVal = (item as any)[key];
        if (Array.isArray(filterVal)) {
          if (!filterVal.includes(itemVal)) return false;
        } else if (itemVal !== filterVal) {
          return false;
        }
      }

      return true;
    });
  }, [data, searchFields, debouncedSearchTerm, filters]);

  const setFilter = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters(initialFilters);
  };

  const isFiltered = searchTerm.trim().length > 0 || Object.values(filters).some((v) => v !== undefined && v !== 'all' && v !== '');

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    clearFilters,
    filteredData,
    isFiltered,
    totalCount: data.length,
    filteredCount: filteredData.length,
  };
}
