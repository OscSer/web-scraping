export interface ArtificialAnalysisModel {
  slug: string;
  model: string;
  reasoningModel: boolean;
  agentic: number | null;
  coding: number | null;
  blendedPrice: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
}

export interface RankedModel {
  model: string;
  position: number;
  score: number;
  price1m: number;
}
