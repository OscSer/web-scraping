export interface ArtificialAnalysisModel {
  model: string;
  agentic: number | null;
  coding: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
}

export interface RankedModel {
  position: number;
  model: string;
  score: number;
  price: number | null;
}
