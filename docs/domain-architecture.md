# Domain Architecture

## Pattern

- Multi-domain plugin architecture using Fastify plugins
- Each domain is a self-contained unit with services, routes, and types
- Single Responsibility: one service class per external API
- Services instantiated at domain level, passed to routes via typed options interface
- Domain-scoped loggers propagate context through layers
- Domains can be independently deployed, tested, and scaled

## Core Concept

### Why Multi-Domain?

The application models business domains as separate, loosely-coupled units. Each represents a distinct business capability.

Each domain owns its complete vertical slice:

- **Service Layer**: HTTP clients to external APIs
- **Route Layer**: HTTP endpoints serving clients
- **Type Layer**: Domain-specific types and errors
- **Plugin Bootstrap**: Service instantiation and dependency wiring

This structure enables:

- Parallel development (different teams work on different domains)
- Independent testing (mock one domain's services without touching others)
- Clear responsibility boundaries (no circular dependencies)
- Future deployment flexibility (deploy domains separately)

## Directory Structure

```
src/
├── domains/
│   ├── [domain-name]/
│   │   ├── index.ts              # Plugin entry, service instantiation
│   │   ├── services/
│   │   │   ├── *-client.ts       # HTTP client to external API
│   │   │   ├── *-service.ts      # Composition/orchestration
│   │   │   └── ...
│   │   ├── routes/
│   │   │   ├── *.ts              # Fastify route handlers
│   │   │   └── ...
│   │   └── types/
│   │       ├── errors.ts         # Domain-specific error types
│   │       ├── responses.ts      # Response types
│   │       └── ...
│   └── [other-domains]/
├── shared/
│   ├── config/
│   ├── types/
│   └── utils/
└── index.ts                      # App bootstrap, register plugins
```

### Key Principles

**One API, One Service Class**: Each external API gets its own service class. This enables:

- Clear responsibility (one class handles one external API)
- Isolated testing (mock one client without affecting others)
- Independent retry/caching strategy per API

**Composition Over Inheritance**: Services that coordinate multiple APIs compose individual API clients rather than inheriting from them.

**Domain Folder = Feature Folder**: All code related to one business capability lives together. Moving or removing a feature is straightforward.

## Plugin Bootstrap Pattern

### 1. Domain Index File Responsibilities

Each domain has an index file that serves as the plugin entry point:

```
Domain Index File
│
├─ Instantiate logger (scoped with domain prefix)
├─ Instantiate all services (pass logger)
├─ Define routes function (accepting typed options)
└─ Register plugin with Fastify
```

Sequence:

1. Create domain-scoped logger by calling `child()` on the Fastify logger with a domain-specific message prefix
2. Instantiate all services in that domain, passing the logger to each constructor
3. Define a typed options interface listing what dependencies routes require
4. Instantiate or define route handlers that accept typed options
5. Register the domain as a Fastify plugin with all dependencies passed as options

Benefits:

- All service instantiation in one place (easy to see what's wired)
- Logger context flows through entire domain
- Type-safe dependency graph (interface enforces what routes need)
- Easy to test (swap real services for mocks in tests)

### 2. Service Constructor Injection

Each service accepts dependencies via constructor:

Services store dependencies as instance properties. This enables:

- No global state (each instance has its own logger, cache, rate limiter)
- Easy testing (pass mock logger, verify behavior)
- Thread-safe (no shared mutable state)

### 3. Typed Route Options Interface

Each domain defines an interface describing what services routes depend on:

```typescript
// Pattern: explicit dependency contract
interface RoutesOptions {
  serviceA: SomeService;
  serviceB: AnotherService;
  logger: Logger;
}

// Routes are a function that receives typed options
export async function setupRoutes(
  fastify: FastifyInstance,
  opts: RoutesOptions,
) {
  fastify.get("/endpoint", async (request, reply) => {
    // Access injected services
    const result = await opts.serviceA.doWork();
  });
}
```

Benefits:

- Explicit contract: code clearly states what services are needed
- Type safety: TypeScript enforces all dependencies are provided
- Testability: mock only what routes actually use
- Discoverability: new developers see immediately what services enable a route

### 4. App Bootstrap

The app bootstrap registers all domains as plugins:

```
App Bootstrap
│
├─ Register domain 1 plugin
├─ Register domain 2 plugin
├─ Register domain N plugin
└─ Start server
```

Each plugin brings its own:

- Services
- Routes
- Error handlers
- Logging scope

Cross-domain communication flows through HTTP (loose coupling) or explicit shared utilities (cache, config).

## Service Organization

### Single Responsibility Services

Services follow Single Responsibility: one class per external API.

Each service handles:

- Own retry logic
- Own caching strategy
- Own error handling
- Own HTTP client setup

### Composition Service

A higher-level service orchestrates multiple API clients:

```
Composition Service
├─ API Client 1
├─ API Client 2
└─ API Client N
```

The composition service:

- Calls multiple API clients in parallel using structured concurrency pattern (e.g., `Promise.allSettled`)
- Combines responses into unified data structure
- Implements fallback logic if some APIs fail

This pattern enables:

- **Reuse**: Individual API clients used by multiple consumers
- **Testing**: Mock one API client without affecting others
- **Observability**: Each API client logs independently
- **Resilience**: Failure in one API doesn't prevent calling others

## Logger Scoping

### Hierarchy

```
Root Logger (from Fastify)
    │
    ├─ [Domain-Name] Domain Logger
    │   │
    │   ├─ [Cache] child logger
    │   └─ [RateLimit] child logger
    │
    └─ [Other-Domain] Domain Logger
        │
        ├─ [Cache] child logger
        └─ [Network] child logger
```

### Pattern

- **Domain Level**: Root logger gets child with domain-specific prefix
- **Feature Level**: Features (service, cache, rate limiter) create their own child with feature-specific prefix
- **No Direct Imports**: No service directly imports or instantiates a logger; always receives via constructor

Benefits:

- Correlation: logs from same domain are grouped
- Source identification: see immediately which domain/feature emitted log
- Context propagation: pass logger to child services; they create their own child loggers
- Testing: mock logger and verify messages

## Type Safety at Domain Boundaries

### Domain-Specific Error Types

Each domain defines custom error types capturing domain context:

```
Domain Errors
├─ FetchError (HTTP status, response body)
├─ ParseError (invalid response structure)
└─ RateLimitError (concurrent request limit hit)
```

Error handler functions catch these typed errors and convert to fallbacks:

```
Error Occurs
    │
    ├─ If FetchError   → warn log, return fallback
    ├─ If ParseError   → error log, return fallback
    └─ If RateLimitError → warn log, return fallback
```

Benefits:

- Specific handling per error type
- Never lose error context
- Easy to test error paths (throw specific error, verify behavior)

### Response Types

Routes type their responses using TypeScript interfaces:

```typescript
// Explicit return type for each endpoint
async function getDetails(): Promise<{ id: number; name: string }> {
  // TypeScript enforces response shape
}
```

Benefits:

- API contract is code (single source of truth)
- Type safety across consumers
- IDE autocomplete for API consumers

## Adding a New Domain

To add a new domain to the application:

1. **Create directory**: `src/domains/[domain-name]/`
2. **Create subdirectories**: `services/`, `routes/`, `types/`
3. **Implement API clients**: one class per external API
4. **Implement routes**: export async function accepting typed options
5. **Create domain index**: instantiate services, wire dependencies, register plugin
6. **Update app bootstrap**: register new domain plugin in main app file

Each step is isolated from existing domains. No touching existing domain code.

## Testing Strategy

### Service Level

```
Mock external API
    │
    └─ Service receives mock logger + mock response
        │
        └─ Verify service parses correctly / handles error
```

Search for how individual services handle errors and external calls.

### Route Level

```
Mock all services in domain
    │
    └─ Route receives mock services + mock logger
        │
        └─ Verify route calls correct service + formats response
```

Search for how routes orchestrate service calls.

### Domain Level

```
Spin up domain with real services
    │
    └─ Tests verify domain integration
```

### Cross-Domain

- Domains don't call each other directly
- No cross-domain tests needed
- If integration testing required, test via HTTP layer (full app)

## Benefits

- **Parallelization**: Multiple teams develop different domains simultaneously
- **Independent Testing**: Mock one domain without affecting others
- **Incremental Deployment**: Deploy one domain without deploying all
- **Clear Ownership**: Each domain has clear boundaries and responsibilities
- **Scalability**: Add new domains without modifying existing code
- **Debugging**: Logs are grouped by domain; easier to trace issues
- **Onboarding**: New developers understand feature by reading one domain folder

## Anti-patterns Avoided

- ❌ **Global Service Registry**: No service manager singleton; services instantiated per domain
- ❌ **Cross-Domain Dependencies**: Domains don't import from each other's services; only shared utils
- ❌ **Shared Logger Without Scoping**: All loggers are scoped to domain/feature; no ambiguity about source
- ❌ **Routes Instantiating Services**: Services created at domain level, injected to routes
- ❌ **Mixed Responsibilities**: One service class doesn't talk to multiple external APIs
- ❌ **Implicit Dependencies**: All dependencies explicit in constructor or interface
- ❌ **Missing Error Types**: Each domain defines its own error types; no generic exceptions
