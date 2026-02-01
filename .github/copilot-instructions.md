# Copilot Instructions for honotreez

## Project Overview

honotreez is a backend boilerplate using **Hono** (web framework), **Drizzle ORM** (PostgreSQL), and **Better Auth** with role-based access control (RBAC). Built to run on **Bun**.

## Architecture Pattern

### Application Bootstrap ([src/index.ts](../src/index.ts))

The app follows a layered middleware approach in this order:

1. **Logger** (`combinedLogger()`) - request/response tracking with colored output
2. **Global rate limiter** - 100 req/min default
3. **CORS** - configured for `process.env.CORS_ORIGIN`
4. **Auth middleware** - attaches `user` to context via Better Auth
5. **Route mounting** - all routes prefixed with `/api`

### Router Pattern ([src/lib/create-app.ts](../src/lib/create-app.ts))

- Use `createRouter()` not `new Hono()` directly - it provides typed context with `AppVariables` (user + requestId)
- All routers inherit: `const router = createRouter()`
- Routes are mounted in [src/index.ts](../src/index.ts) via: `app.basePath('/api').route('/', router)`

### Authentication Flow

- Better Auth handles all `/api/auth/**` routes automatically ([src/routes/auth.ts](../src/routes/auth.ts))
- User context is available as `c.get('user')` in all routes after auth middleware runs
- Password hashing uses Argon2id with specific parameters ([src/lib/auth.ts](../src/lib/auth.ts))

## Route Guards ([src/auth/auth-guard.ts](../src/auth/auth-guard.ts))

Four guard types available:

- `authGuard()` - require any authenticated user
- `adminGuard()` - require admin role
- `roleGuard(['role1', 'role2'])` - require specific role(s)
- `permissionGuard({ resource: ['action'] })` - fine-grained Better Auth permissions

**Usage pattern:**

```typescript
app.get('/protected', authGuard(), (c) => { ... })
app.get('/admin/users', roleGuard(['admin', 'moderator']), (c) => { ... })
```

## Permissions System ([src/auth/permissions.ts](../src/auth/permissions.ts))

- Uses Better Auth's `createAccessControl()` with statement-based permissions
- Extend `statement` object to add new resources with actions: `['create','read','update','delete']`
- Define per-role permissions in `admin` and `user` objects
- Default role is `user`; additional fields in user table: `role`, `banned`, `banReason`, `banExpires`

## Database Patterns

- **Connection:** Single Drizzle instance exported from [src/db/index.ts](../src/db/index.ts) using node-postgres Pool
- **Schema location:** [src/db/schema/](../src/db/schema/) - Better Auth requires: user, session, account, verification tables
- **ID generation:** Use `generateId()` from [src/lib/utils.ts](../src/lib/utils.ts) (nanoid 32 chars)
- **Timestamps:** Use `.$defaultFn(() => new Date())` pattern for createdAt/updatedAt

## Developer Workflows

### Database Operations

```bash
bun run db:generate    # Generate migrations from schema
bun run db:migrate     # Apply migrations
bun run db:push        # Push schema directly (dev only)
bun run db:studio      # Open Drizzle Studio GUI
bun run db:seed        # Run seeders
bun run db:reset       # Reset database
```

### Development

```bash
bun run dev            # Hot-reload server (--hot flag)
bun run start          # Production mode
bun run format         # Prettier with import sorting
```

### Environment Variables Required

- `DATABASE_URL` - PostgreSQL connection string
- `CORS_ORIGIN` - Frontend URL (defaults to http://localhost:3001)
- `BETTER_AUTH_SECRET` - Better Auth session secret (generate with `npx better-auth generate`)

## Rate Limiting ([src/lib/rate-limit.ts](../src/lib/rate-limit.ts))

- Global limit: 100 req/min applied to all routes
- Use presets: `rateLimitPresets.strict()` (5/15min for auth), `moderate()` (50/15min), `generous()` (100/min), `public()` (1000/hr)
- Custom limits: `rateLimit({ limit: 50, windowMs: 15*60*1000 })`
- Default store is in-memory; Better Auth also has database-backed rate limiting for auth routes

## Logging ([src/lib/logger.ts](../src/lib/logger.ts))

- `combinedLogger()` - automatic HTTP request/response logging with colors
- Auto-redacts sensitive fields (password, token, secret) from request bodies
- Warns on slow requests (>1000ms)
- Access logger instance: `const logger = new Logger()`

## Code Conventions

- **Path aliases:** Use `@/` for [src/](../src/) directory (configured in tsconfig)
- **Imports:** Sorted automatically via `@trivago/prettier-plugin-sort-imports`
- **Type safety:** Auth context types defined as `AuthType` interface in [src/lib/auth.ts](../src/lib/auth.ts)
- **Error handling:** Use `HTTPException` from `hono/http-exception` with status codes
- **Constants:** Define in SCREAMING_CASE objects (e.g., `AUTH_MESSAGE` in guards)

## Adding New Features

1. **New route group:** Create file in [src/routes/](../src/routes/), use `createRouter()`, mount in [src/routes/index.ts](../src/routes/index.ts)
2. **New table:** Add schema to [src/db/schema/](../src/db/schema/), run `bun run db:generate`, then `db:migrate`
3. **New permission:** Extend `statement` in [src/auth/permissions.ts](../src/auth/permissions.ts), add to role definitions
4. **New middleware:** Create in [src/lib/](../src/lib/), apply in [src/index.ts](../src/index.ts) or per-route

## Critical Notes

- Better Auth requires exact table names: `user`, `session`, `account`, `verification`
- All routes get `/api` prefix - frontend should call `/api/auth/sign-in`, not `/auth/sign-in`
- Auth middleware populates `c.get('user')` but doesn't reject unauthenticated requests - use guards for protection
- Session expires in 7 days, updates every 24 hours when active
