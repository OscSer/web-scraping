export interface ArtificialAnalysisModel {
  model: string;
  agentic: number | null;
  coding: number | null;
  blendedPrice: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
}

export interface RankedModel {
  position: number;
  model: string;
  score: string;
  price: string | null;
}
