export interface Cache<T> {
  get(key: string): Promise<T | null>;
  set(key: string, data: T): Promise<void>;
  getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T>;
  clear(): Promise<void>;
  delete(key: string): Promise<void>;
}
