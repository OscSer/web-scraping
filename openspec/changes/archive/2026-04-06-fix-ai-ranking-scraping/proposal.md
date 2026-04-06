## Why

The `/ai/ranking` endpoint is returning `SCRAPING_ERROR` (502) because the target website artificialanalysis.ai changed its data structure. The site now distributes model data across multiple Next.js flight payload chunks with different schemas, breaking the existing single-chunk parsing logic.

## What Changes

- **Modify** `src/domains/ai/services/artificial-analysis-client.ts` to parse data from multiple Next.js flight chunks
- **Update** model extraction logic to merge metadata from chunk 31 with performance data from chunk 14
- **Update** field name mappings to match new API structure (`model_name` → `name`, `isReasoning` → `reasoning_model`)
- **Update** related test files to reflect new data structure

## Capabilities

### New Capabilities
- *(none - this is a fix to existing capability)*

### Modified Capabilities
- `ai-model-ranking`: Update parsing logic to handle fragmented data across multiple flight chunks instead of single chunk

## Impact

- Affected: `src/domains/ai/services/artificial-analysis-client.ts` and its test file
- API: No breaking changes to `/ai/ranking` endpoint response format
- Dependencies: None
