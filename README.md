# 🌳 honotreez

> A modern, production-ready backend boilerplate built with Hono, Drizzle ORM, and Better Auth

honotreez is a fast, secure, and scalable backend starter template featuring role-based access control (RBAC), built-in authentication, and optimized Docker support. Perfect for building APIs and web services with Bun runtime.

## ✨ Features

- ⚡ **[Hono](https://hono.dev/)** - Ultra-fast web framework for the Edge
- 🗄️ **[Drizzle ORM](https://orm.drizzle.team/)** - TypeScript ORM with PostgreSQL support
- 🔐 **[Better Auth](https://better-auth.com/)** - Complete authentication system with RBAC
- 🏃 **[Bun](https://bun.sh/)** - Fast all-in-one JavaScript runtime
- 🐳 **Docker Support** - Development and production-ready Dockerfiles
- 🔒 **Security First** - Rate limiting, CORS, non-root containers
- 📊 **Database Tools** - Migrations, seeding, and Drizzle Studio
- 📝 **TypeScript** - Full type safety with path aliases
- 🎨 **Code Quality** - Prettier with auto-import sorting
- 📈 **Logging** - Colored request/response logging with auto-redaction

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (v1.3.8 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v14 or higher)
- [Docker](https://www.docker.com/) (optional, for containerized development)

### Local Development

1. **Clone the repository**

```bash
git clone https://github.com/wanrif/honotreez.git
cd honotreez
```

2. **Install dependencies**

```bash
bun install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` and configure your settings:

```env
DATABASE_URL=postgresql://postgres@localhost:5432/honotreez
BETTER_AUTH_SECRET=your-secret-here  # Generate with: bunx better-auth generate
CORS_ORIGIN=http://localhost:3001
```

4. **Set up the database**

```bash
# Generate migration files
bun run db:generate

# Run migrations
bun run db:migrate

# (Optional) Seed the database
bun run db:seed
```

5. **Start the development server**

```bash
bun run dev
```

The server will start at `http://localhost:3000`

### Docker Development

For containerized development with PostgreSQL:

```bash
# Start development environment
docker-compose --profile dev up -d

# Run migrations
docker-compose exec app-dev bun run db:migrate

# View logs
docker-compose logs -f app-dev

# Stop services
docker-compose --profile dev down
```

See [DOCKER_USAGE.md](DOCKER_USAGE.md) for complete Docker documentation.

## 📁 Project Structure

```
honotreez/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── auth/
│   │   ├── auth-guard.ts       # Auth middleware (authGuard, roleGuard, etc.)
│   │   └── permissions.ts      # RBAC permission definitions
│   ├── db/
│   │   ├── index.ts            # Database connection
│   │   ├── schema/             # Drizzle schema definitions
│   │   └── migrations/         # Database migrations
│   ├── lib/
│   │   ├── auth.ts            # Better Auth configuration
│   │   ├── create-app.ts      # Hono app factory
│   │   ├── logger.ts          # Request/response logging
│   │   ├── rate-limit.ts      # Rate limiting middleware
│   │   └── utils.ts           # Utility functions
│   └── routes/
│       ├── index.ts           # Route aggregator
│       ├── auth.ts            # Auth routes (/api/auth/**)
│       └── dashboard.ts       # Dashboard routes
├── Dockerfile.dev             # Development Dockerfile
├── Dockerfile.prod            # Production Dockerfile
├── docker-compose.yml         # Docker Compose configuration
├── drizzle.config.ts         # Drizzle ORM configuration
└── package.json              # Project dependencies and scripts
```

## 🔐 Authentication & Authorization

### Built-in Features

- ✅ Email & Password authentication
- ✅ Session management (7-day expiration)
- ✅ Role-based access control (RBAC)
- ✅ Permission-based guards
- ✅ User banning system
- ✅ Argon2id password hashing
- ✅ Database-backed rate limiting

### Auth Routes

All authentication routes are available at `/api/auth/**`:

- `POST /api/auth/sign-up` - Register new user
- `POST /api/auth/sign-in` - Login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get current session

### Using Auth Guards

```typescript
import { authGuard, roleGuard, permissionGuard } from '@/auth/auth-guard'
import { createRouter } from '@/lib/create-app'

const router = createRouter()

// Require any authenticated user
router.get('/protected', authGuard(), (c) => {
  const user = c.get('user')
  return c.json({ user })
})

// Require admin role
router.get('/admin/users', roleGuard('admin'), (c) => {
  return c.json({ message: 'Admin only' })
})

// Require specific permissions
router.post('/posts', permissionGuard({ posts: ['create'] }), (c) => {
  return c.json({ message: 'Can create posts' })
})
```

### Defining Permissions

Edit `src/auth/permissions.ts` to define resources and permissions:

```typescript
const statement = {
  ...defaultStatements,
  posts: ['create', 'read', 'update', 'delete'],
  comments: ['create', 'read', 'update', 'delete'],
} as const

export const admin = ac.newRole({
  ...adminAc.statements,
  posts: ['create', 'read', 'update', 'delete'],
  comments: ['create', 'read', 'update', 'delete', 'moderate'],
})

export const user = ac.newRole({
  ...userAc.statements,
  posts: ['read'],
  comments: ['create', 'read'],
})
```

## 🛣️ Routing

### Creating New Routes

```typescript
// src/routes/posts.ts
import { authGuard } from '@/auth/auth-guard'
import { createRouter } from '@/lib/create-app'

const posts = createRouter()

posts.get('/', async (c) => {
  // List all posts
  return c.json({ posts: [] })
})

posts.post('/', authGuard(), async (c) => {
  // Create a post (requires authentication)
  const user = c.get('user')
  return c.json({ message: 'Post created', userId: user?.id })
})

export default posts
```

Register the route in `src/routes/index.ts`:

```typescript
import posts from './posts'

appRouter.route('/posts', posts)
```

## 🗄️ Database

### Available Commands

```bash
# Generate migrations from schema changes
bun run db:generate

# Apply migrations to database
bun run db:migrate

# Push schema directly (dev only, skips migrations)
bun run db:push

# Open Drizzle Studio (database GUI)
bun run db:studio

# Seed the database
bun run db:seed

# Reset the database
bun run db:reset
```

### Creating a New Table

1. Create schema file in `src/db/schema/`:

```typescript
// src/db/schema/posts-schema.ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { generateId } from '@/lib/utils'
import { user } from './auth-schema'

export const posts = pgTable('posts', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: text('author_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
})
```

2. Generate and run migration:

```bash
bun run db:generate
bun run db:migrate
```

## 🔧 Middleware

### Rate Limiting

```typescript
import { rateLimit, rateLimitPresets, createUserRateLimit } from '@/lib/rate-limit'

// Global rate limit (already applied in src/index.ts)
app.use('*', rateLimit({ limit: 100, windowMs: 60000 }))

// Use presets
app.use('/auth/**', rateLimitPresets.strict()) // 5 req/15min

// Per-user rate limiting
app.use('/api/**', createUserRateLimit({ limit: 50 }))
```

### Logging

Logging is automatically applied to all requests in `src/index.ts`:

```typescript
import { combinedLogger, logger } from '@/lib/logger'

// Applied globally
app.use('*', combinedLogger())

// Manual logging
logger.info('Something happened', { data: 'value' })
logger.warn('Warning message')
logger.error('Error occurred', { error })
```

Features:

- Colored console output
- Request/response tracking
- Auto-redacts sensitive fields (password, token, secret)
- Slow request warnings (>1000ms)

## 🐳 Docker

### Development

```bash
docker-compose --profile dev up -d
```

### Production

```bash
docker-compose --profile prod up -d --build
```

See [DOCKER_USAGE.md](DOCKER_USAGE.md) for complete documentation.

## 📝 Available Scripts

| Command               | Description                              |
| --------------------- | ---------------------------------------- |
| `bun run dev`         | Start development server with hot-reload |
| `bun run start`       | Start production server                  |
| `bun run format`      | Format code with Prettier                |
| `bun run db:generate` | Generate database migrations             |
| `bun run db:migrate`  | Run database migrations                  |
| `bun run db:push`     | Push schema to database (dev only)       |
| `bun run db:studio`   | Open Drizzle Studio GUI                  |
| `bun run db:seed`     | Seed the database                        |
| `bun run db:reset`    | Reset the database                       |

## 🏗️ Tech Stack

- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime
- **Framework**: [Hono](https://hono.dev/) - Lightweight web framework
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- **Database**: [PostgreSQL](https://www.postgresql.org/) - Relational database
- **Auth**: [Better Auth](https://better-auth.com/) - Authentication library
- **Validation**: [Zod](https://zod.dev/) - TypeScript-first schema validation
- **Password Hashing**: [@node-rs/argon2](https://github.com/napi-rs/node-rs) - Argon2 implementation
- **Date/Time**: [dayjs](https://day.js.org/) - Lightweight date library
- **ID Generation**: [nanoid](https://github.com/ai/nanoid) - Tiny unique ID generator

## 🔒 Security Features

- ✅ Non-root Docker containers
- ✅ Argon2id password hashing (memory-hard algorithm)
- ✅ Rate limiting (global and per-route)
- ✅ CORS configuration
- ✅ Environment variable validation
- ✅ Sensitive field redaction in logs
- ✅ Session expiration and refresh
- ✅ User banning system
- ✅ Database-backed rate limiting for auth routes

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Hono](https://hono.dev/) for the amazing web framework
- [Drizzle Team](https://orm.drizzle.team/) for the excellent ORM
- [Better Auth](https://better-auth.com/) for authentication
- [Bun](https://bun.sh/) for the fast runtime

## 📚 Additional Documentation

- [Docker Usage Guide](DOCKER_USAGE.md) - Complete Docker setup and commands
- [Better Auth Docs](https://better-auth.com/docs) - Authentication documentation
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview) - Database ORM guide
- [Hono Documentation](https://hono.dev/docs) - Web framework documentation

---

Made with ❤️ using [Bun](https://bun.sh/)
