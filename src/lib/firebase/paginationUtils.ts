import {
  Query,
  DocumentSnapshot,
  getDocs,
  query,
  limit,
  startAfter,
  QueryConstraint,
} from 'firebase/firestore';
import { DEFAULT_PAGE_SIZE } from '../constants';

export interface PaginatedResult<T> {
  items: T[];
  lastDocSnap: DocumentSnapshot | null;
  hasMore: boolean;
}

export interface PaginatedOptions {
  pageSize?: number;
  lastDocSnap?: DocumentSnapshot | null;
}

/**
 * Executes a cursor-based paginated Firestore query efficiently.
 */
export async function fetchPaginatedDocs<T>(
  baseQuery: Query,
  options: PaginatedOptions = {}
): Promise<PaginatedResult<T>> {
  const pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
  const constraints: QueryConstraint[] = [limit(pageSize + 1)];

  if (options.lastDocSnap) {
    constraints.push(startAfter(options.lastDocSnap));
  }

  const paginatedQuery = query(baseQuery, ...constraints);
  const snapshot = await getDocs(paginatedQuery);

  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

  const items = pageDocs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as T[];

  const newLastDocSnap = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

  return {
    items,
    lastDocSnap: newLastDocSnap,
    hasMore,
  };
}
