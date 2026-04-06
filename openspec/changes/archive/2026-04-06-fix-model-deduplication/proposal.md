## Why

The deduplication logic in `parseModelsFromHtml` uses a `Map` that overwrites duplicate slugs with the last value encountered. However, real data from artificialanalysis.ai shows that different Next.js flight chunks contain **different fields** for the same model slug:

- **Chunk 11**: has `isReasoning`, `shortName`, `creator` (metadata)
- **Chunk 28**: has `coding_index`, `price_*`, `intelligence_index` (performance data) but **NOT** `isReasoning`

With "last wins" deduplication, metadata from chunk 11 gets overwritten by chunk 28, causing `isReasoning` to become `undefined`.

## What Changes

- **Fix model deduplication**: Instead of deduplicating before the merge, merge all chunk data first, then deduplicate the final merged result
- **Alternative approach**: Deduplicate using a merge strategy that preserves all fields from all chunks (not just the last value)

## Capabilities

### New Capabilities

- `model-data-merge`: Defines how model data from multiple Next.js flight chunks should be merged to preserve all fields

### Modified Capabilities

- (none - this is a bug fix that doesn't change expected behavior, just fixes incorrect implementation)

## Impact

- **File**: `src/domains/ai/services/artificial-analysis-client.ts`
- **Function**: `parseModelsFromHtml`
- **Tests**: `artificial-analysis-client.test.ts` should be updated to verify deduplication works correctly
