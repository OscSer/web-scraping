export interface TickerData {
  price: number;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
