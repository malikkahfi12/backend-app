# AGENTS.md

## Security

- **NEVER read or access `.env` files.** These contain secrets (database passwords, API keys, JWT secrets). To understand what environment variables the app expects, read `.env.example` instead.

---

## Project Overview

NestJS v11 backend for a public transit platform. TypeScript 5.7, Prisma v7 with PostgreSQL/PostGIS, Redis (ioredis). Follows Clean Architecture / DDD within each module.

## Common Commands

| Command | Purpose |
|---|---|
| `npm run start:dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run lint` | ESLint with type-checked rules |
| `npm run format` | Prettier formatting |
| `npm run test` | Run unit tests (Jest) |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate:dev` | Create and apply a new migration |
| `npm run prisma:migrate` | Apply pending migrations |
| `npm run prisma:studio` | Open Prisma Studio GUI |
| `npm run db:reset` | Reset database and re-run migrations + seed |
| `npm run db:seed` | Run seed script |

## Code Conventions

### Clean Architecture Layers

Each module follows this structure:

```
module/
  domain/              # Entities + repository interfaces (DI tokens)
  application/         # Service layer (business logic)
  infrastructure/      # Prisma repository implementations
  presentation/        # Controllers, DTOs, mappers
```

- Repository interfaces are defined in `domain/repositories/` and exported as DI tokens (e.g., `STOP_REPOSITORY`).
- Concrete Prisma implementations live in `infrastructure/repositories/`.
- Bind them in the module's `providers` array: `{ provide: TOKEN, useClass: PrismaImpl }`.
- Services inject repositories via `@Inject(TOKEN)`.

### Path Alias

`@/*` maps to `./src/*` (see `tsconfig.json` paths). When importing, prefer:

```ts
import { FooService } from '@/modules/foo/application/services/foo.service';
```

### Formatting

- Single quotes, trailing commas, no unnecessary comments.
- ESLint + Prettier configured in `eslint.config.mjs` / `.prettierrc`.

### Prisma

- Use `PrismaService` from `@/infrastructure/database/prisma.service` (never instantiate PrismaClient directly).
- `PrismaService` uses `@prisma/adapter-pg` with a native `pg.Pool`.
- The schema is at `prisma/schema.prisma`. After schema changes, run `npm run prisma:generate`.

### NestJS Patterns

- Global prefix: `/api/v1` (set in `src/app.setup.ts`).
- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- Global exception filter (`GlobalExceptionFilter`) and interceptors (`WrapResponseInterceptor`, `RequestLoggingInterceptor`) registered in `app.module.ts`.
- Auth guard (JWT) is global via `SecurityModule`. Use `@Public()` decorator for unauthenticated routes, `@Internal()` for internal service token auth.
- Response envelope: `{ success, data, meta }` on success, `{ success, error: { code, message } }` on error.

## Creating a New Module

1. Create the directory under `src/modules/<name>/`.
2. Create subdirectories: `domain/`, `application/`, `infrastructure/`, `presentation/` (if needed).
3. Define the entity in `domain/entities/`.
4. Define the repository interface in `domain/repositories/` (extend `BaseRepository` interface, export a DI token as a string constant).
5. Implement the Prisma repository in `infrastructure/repositories/`.
6. Create the service in `application/services/`.
7. Create the controller in `presentation/controllers/` with DTOs in `presentation/dto/` and mappers in `presentation/mappers/`.
8. Create `module-name.module.ts` that wires providers and controllers.
9. Import the module in `src/app.module.ts`.

For entities under `transit/core/`, follow the existing pattern: register the repository token and Prisma implementation in `transit-core.module.ts`.

## Testing

- Unit tests: `*.spec.ts` files alongside source code. Run with `npm run test`.
- E2E tests: `test/app.e2e-spec.ts`. Run with `npm run test:e2e`.
- Test framework: Jest with `ts-jest`.
- GTFS test fixtures in `test/fixtures/gtfs/` (valid data, invalid lat/times, missing files).

## Before Committing

```bash
npm run lint
npm run build
npm run test
```

## Docker

Multi-service setup via `docker-compose.yml`:

- **api** — NestJS app on port 3000 (multi-stage Dockerfile).
- **postgres** — PostGIS 16-3.4 with health check.
- **redis** — Redis 7 Alpine with health check.

```bash
docker compose up --build
```
