## Context

The `ArtificialAnalysisClient` currently parses model data from a single Next.js flight payload chunk. The site artificialanalysis.ai recently restructured its data to use multiple chunks:

- **Chunk 31**: Contains basic model metadata (`slug`, `name`, `isReasoning`, `creator`)
- **Chunk 14**: Contains performance metrics (`coding_index`, `agentic_index`, `price_1m_blended_3_to_1`)

The current implementation uses a single pattern `"models"\s*:\s*\[` to locate data, which only matches chunk 31. Since chunk 31 lacks the required performance fields (`coding_index`, etc.), the parsing fails and returns empty results.

## Goals / Non-Goals

**Goals:**
- Parse model data from multiple flight chunks
- Merge metadata (from chunk 31) with performance data (from chunk 14)
- Use `slug` as the join key between chunks
- Maintain backward compatibility with existing `ArtificialAnalysisModel` interface
- Update tests to reflect new data structure

**Non-Goals:**
- Changing the `/ai/ranking` API response format
- Adding new fields or capabilities
- Modifying caching or rate limiting behavior

## Decisions

**1. Multi-chunk parsing strategy**
- Continue using regex to extract all flight payload chunks
- Search for `"models"` arrays AND standalone model objects with performance fields
- Merge data by matching `slug` field across chunks
- *Rationale*: The site uses `slug` as a consistent identifier across all data fragments

**2. Field mapping normalization**
- Accept both `isReasoning` (new) and `reasoning_model` (old) as equivalent
- Map `name` (new) to `model` (existing interface)
- Keep existing field names in the output interface for backward compatibility
- *Rationale*: Minimize changes to downstream consumers

**3. Error handling**
- Maintain existing error types (`AiFetchError`, `AiParseError`)
- Throw `AiParseError` if no models can be assembled after merging
- *Rationale*: Consistent error contract for the route handler

## Risks / Trade-offs

- **[Risk]** Site structure changes again → Mitigation: Add logging for chunk detection to aid future debugging
- **[Trade-off]** Merging logic adds complexity → Offset by improved resilience to data fragmentation
- **[Trade-off]** Regex-based parsing is fragile → No alternative given server-side rendering approach
