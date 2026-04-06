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

export interface RawArtificialAnalysisModel {
  slug?: string;
  reasoning_model?: boolean;
  isReasoning?: boolean;
  short_name?: string;
  model_name?: string;
  name?: string;
  agentic_index?: number;
  coding_index?: number;
  price_1m_blended_3_to_1?: number;
  price_1m_input_tokens?: number;
  price_1m_output_tokens?: number;
}

export interface PerformanceData {
  slug: string;
  coding: number | null;
  agentic: number | null;
  blendedPrice: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
}
