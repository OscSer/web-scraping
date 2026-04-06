## Context

The `parseModelsFromHtml` function parses Next.js flight payload chunks from artificialanalysis.ai. Real data analysis shows:

- **Chunk 11**: Contains 688 models with metadata fields (`slug`, `name`, `shortName`, `isReasoning`, `creator`)
- **Chunk 28**: Contains 1855 models with performance fields (`slug`, `tau2`, `coding_index`, `price_*`, `intelligence_index`)
- **Both chunks**: Have overlapping slugs (590 duplicate slugs found)

The same model (e.g., `gpt-5-4-mini`) exists in both chunks but with **different fields**. Chunk 11 has `isReasoning: true`, but chunk 28 does not have this field.

## Goals / Non-Goals

**Goals:**
- Preserve all fields from all chunks when merging model data
- Ensure `isReasoning`, `shortName`, `creator` metadata is not lost during deduplication
- Maintain correct slug-based deduplication (one entry per slug in final output)

**Non-Goals:**
- Changing the chunk extraction logic (chunks are extracted correctly)
- Modifying `extractModelsFromModelsArray` or `extractPerformanceDataFromChunk`
- Adding new fields - just preserving existing data

## Decisions

### Decision 1: Deduplication Strategy

**Problem**: The current `Map` approach uses "last wins" semantics, overwriting earlier values with later ones.

**Solution**: Change deduplication to use **"first wins"** semantics - keep the first occurrence of each slug and discard subsequent duplicates.

**Rationale**: 
- Chunk 11 appears earlier in the HTML and contains the canonical metadata
- Preserving first occurrences maintains data integrity for fields like `isReasoning`
- "First wins" is safer when chunks contain partial data

**Alternatives considered**:
- "Last wins" (current): Loses metadata from earlier chunks ❌
- Deep merge all fields: Complex and unnecessary given chunk structure ✓
- Deduplicate after merge: Would still have duplicate slugs in intermediate arrays

### Decision 2: Where to Apply Deduplication

**Option A**: Deduplicate `metadataModels` before `mergeModelData` (current approach, but with wrong semantics)
**Option B**: Deduplicate after merge, using a Map that preserves first occurrence

**Solution**: Option A with corrected semantics - deduplicate `metadataModels` before merge using "first wins".

**Rationale**: 
- `mergeModelData` already handles slug-based merging of performance data
- Deduplicating metadata first ensures we don't lose metadata fields
- Simpler than changing the merge function

## Risks / Trade-offs

[Risk] Performance data from later chunks might have updated values → **Mitigation**: Performance data uses a separate Map in `mergeModelData` and overwrites correctly by slug

[Risk] If a slug only appears in performance chunks (not in any metadata chunk) → **Mitigation**: The code already handles this case - models without metadata use default values

[Trade-off] "First wins" means if chunk 11 has stale data but chunk 28 has updated data, we keep stale → **Accepted**: Chunk 11's metadata (name, isReasoning) is the authoritative source; performance data is merged separately

## Migration Plan

1. Change line 291 in `artificial-analysis-client.ts`:
   - From: `const metadataBySlug = new Map(metadataModels.map((m) => [m.slug, m]));` (last wins)
   - To: Reverse the array before creating Map (first wins)

2. Add a test case that verifies `isReasoning` is preserved when the same slug appears in multiple chunks with different fields

3. Run existing tests to ensure no regression
