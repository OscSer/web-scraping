## 1. Fix Deduplication Logic

- [x] 1.1 Change Map creation in `parseModelsFromHtml` to use "first wins" semantics by iterating in order and only adding unseen slugs
- [x] 1.2 Verify the fix works with existing tests

## 2. Add Test Coverage

- [x] 2.1 Add test case where same slug appears in multiple chunks with different fields (isReasoning in first, missing in second)
- [x] 2.2 Add test case where same slug appears in multiple chunks with same metadata fields
- [x] 2.3 Run full test suite to ensure no regressions
