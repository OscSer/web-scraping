## ADDED Requirements

### Requirement: Duplicate slugs use first-occurrence semantics

When extracting models from multiple Next.js flight payload chunks, if the same slug appears in multiple chunks, the system SHALL keep the first occurrence and discard subsequent duplicates.

#### Scenario: Same slug in chunk 11 and chunk 28
- **WHEN** chunk 11 provides `isReasoning: true` for slug `gpt-5-4-mini` and chunk 28 provides no `isReasoning` field for the same slug
- **THEN** the final model SHALL have `isReasoning: true` (from chunk 11)

#### Scenario: Slug only appears in one chunk
- **WHEN** a slug appears in only one chunk
- **THEN** that model SHALL be included without modification

### Requirement: All fields preserved from first occurrence

The first occurrence of a model SHALL preserve all its fields in the final result, including `slug`, `name`, `shortName`, `isReasoning`, and `creator`.

#### Scenario: Metadata fields preserved
- **WHEN** the first occurrence contains `isReasoning: true` and `shortName: "GPT-5.4 mini"`
- **THEN** the final model SHALL contain both `isReasoning: true` and `shortName: "GPT-5.4 mini"`

### Requirement: Performance data merged by slug after deduplication

After deduplicating metadata, performance data SHALL be merged using slug-based lookup, overwriting only the performance-specific fields (`coding`, `agentic`, `blendedPrice`, `inputPrice`, `outputPrice`).

#### Scenario: Performance data merged correctly
- **WHEN** deduplicated metadata has slug `gpt-5-4-mini` and performance data contains `coding_index: 51.48` for the same slug
- **THEN** the final model SHALL have `coding: 51.48`
