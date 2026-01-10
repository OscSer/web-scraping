export interface TickerData {
  ticker: string;
  issuer: string;
  price: number | null;
  volume: number;
  quantity: number | null;
  board: string;
  tradeDate: string;
  percentageVariation: number | null;
  absoluteVariation: number | null;
  openPrice: number | null;
  maximumPrice: number | null;
  minimumPrice: number | null;
  averagePrice: number | null;
}

type NumericLike = number | string;

type NullableNumericLike = NumericLike | null;

export interface BvcLvl2Response {
  data: {
    tab: Array<{
      issuer: string;
      mnemonic: string;
      lastPrice: NullableNumericLike;
      openPrice: NullableNumericLike;
      maximumPrice: NullableNumericLike;
      averagePrice: NullableNumericLike;
      minimumPrice: NullableNumericLike;
      quantity: NullableNumericLike;
      volume: NullableNumericLike;
      absoluteVariation: NullableNumericLike;
      percentageVariation: NullableNumericLike;
      board: string;
    }>;
    marketStatus: {
      delay: string;
      interval: string;
      download: string;
      bvcEmail: string;
      tradedVolume: number;
      status: string;
      fileName: Record<string, string>;
      totalVolume: number;
      countedVolume: number;
      ttvVolume: number;
      repoVolume: number;
    };
  };
}

export interface TokenInfo {
  token: string;
  expiresAt?: number;
  source: "http";
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
