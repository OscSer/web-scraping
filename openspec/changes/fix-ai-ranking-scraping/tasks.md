## 1. Update ArtificialAnalysisClient Parsing Logic

- [x] 1.1 Modify `extractModelsFromChunk` to search for both `"models"` arrays AND standalone model objects with performance fields
- [x] 1.2 Add function to extract performance data chunks (search for `coding_index` pattern)
- [x] 1.3 Implement `mergeModelData(metadataChunks, performanceChunks)` to join by `slug`
- [x] 1.4 Update `normalizeModel` to handle new field names (`isReasoning`, `name`)
- [x] 1.5 Update `parseModelsFromHtml` to orchestrate multi-chunk extraction

## 2. Update Tests

- [x] 2.1 Update test HTML fixtures to match new multi-chunk structure
- [x] 2.2 Add test case for models distributed across chunks
- [x] 2.3 Add test case for field name variations (`isReasoning` vs `reasoning_model`)
- [x] 2.4 Add test case for missing performance data
- [x] 2.5 Verify all existing tests still pass with new implementation

## 3. Verification

- [x] 3.1 Run `npm test` and ensure all AI domain tests pass
- [x] 3.2 Manually test `/ai/ranking` endpoint returns valid data
- [x] 3.3 Verify response includes models with `coding`, `agentic`, and `blendedPrice` fields
