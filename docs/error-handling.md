# Error Handling

## Pattern

- Custom error types with domain context
- Centralized error handler function
- Fallback cascade: primary source → secondary source → error response
- Parallel operations use try-all-gather approach for fault tolerance

## Strategy Layers

### 1. Custom Error Types

Located in domain types directories:

- Typed errors with domain-specific context
- Includes relevant metadata (HTTP status, message, response structure info)
- Enables different handling strategies based on error type

### 2. Centralized Error Handler

Located in domain utils:

- Handler function accepts error and fallback value
- Logs contextually based on error type (warn vs. error)
- Always returns fallback value, never throws
- Converts exceptions into recoverable states

### 3. Service Layer

Search for catch blocks in service implementations:

- Catch typed errors in service methods
- Call error handler function to convert to fallback
- Return null or default value, not error

### 4. Route Layer

Search for try-catch patterns in route handlers:

- Try-catch cascade with manual fallback attempt
- Primary source fails → log and attempt secondary source
- Both fail → return appropriate error response
- Maintains service availability by graceful degradation

### 5. Parallel Operations

Search for parallel operation patterns in service implementations:

- Promise.all-settled approach for independent async operations
- Extract results and handle rejections individually
- Warn on specific failures, continue with fallback values
- Prevents single failure from blocking all operations

## Benefits

- **Graceful degradation**: Service continues with fallback data
- **No cascading failures**: Errors localized to source
- **Contextual logging**: Error type determines log level
- **Testable**: Error paths explicit and verifiable
- **Resilient**: Multiple fallback sources improve availability

## Anti-patterns Avoided

- ❌ Throwing errors and letting caller handle
- ❌ Swallowing errors silently (always log)
- ❌ Generic try-catch without fallback strategy
- ❌ Losing error context in outer layers
