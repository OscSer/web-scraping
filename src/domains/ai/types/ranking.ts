export interface ArtificialAnalysisModel {
  model: string;
  agentic: number | null;
  coding: number | null;
}

export interface RankedModel {
  model: string;
  index: number;
  agentic: number;
  coding: number;
}
