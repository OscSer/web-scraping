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

export interface BvcLvl2Response {
  data: {
    tab: Array<{
      issuer: string;
      mnemonic: string;
      lastPrice: number | null;
      openPrice: number | null;
      maximumPrice: number | null;
      averagePrice: number | null;
      minimumPrice: number | null;
      quantity: number | null;
      volume: number;
      absoluteVariation: number | null;
      percentageVariation: number | null;
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
