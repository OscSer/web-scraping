## MODIFIED Requirements

### Requirement: Parse models from multiple flight chunks
The system SHALL extract model data from multiple Next.js flight payload chunks and merge them using `slug` as the join key.

#### Scenario: Models distributed across chunks
- **WHEN** the HTML contains model metadata in chunk 31 (slug, name, isReasoning) and performance data in chunk 14 (slug, coding_index, agentic_index, price_1m_blended_3_to_1)
- **THEN** the system SHALL merge data by matching slug and return complete ArtificialAnalysisModel objects

#### Scenario: Field name variations
- **WHEN** the source data uses `isReasoning` or `reasoning_model` for the reasoning flag
- **THEN** the system SHALL normalize both to the `reasoningModel` boolean field

#### Scenario: Missing performance data
- **WHEN** a model from metadata chunk lacks corresponding performance data
- **THEN** the system SHALL set coding, agentic, and price fields to null

### Requirement: Handle new data structure
The system SHALL support both old and new field names from artificialanalysis.ai.

#### Scenario: New field names
- **WHEN** the source uses `name` instead of `model_name`
- **THEN** the system SHALL map it to the `model` field in the output

#### Scenario: New reasoning field
- **WHEN** the source uses `isReasoning` instead of `reasoning_model`
- **THEN** the system SHALL recognize it as equivalent
